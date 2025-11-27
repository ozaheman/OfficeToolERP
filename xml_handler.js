/**
 * Escapes special characters in a string for use in XML content.
 * This is the correct implementation.
 * @param {string} unsafe The string to escape.
 * @returns {string} The escaped string.
 */
function escapeXml(unsafe) {
    if (typeof unsafe !== 'string') return unsafe;
    // The order is important here, especially for the ampersand.
    return unsafe.replace(/&/g, "&amp;")
                 .replace(/</g, "&lt;")
                 .replace(/>/g, "&gt;")
                 .replace(/"/g, "&quot;")
                 .replace(/'/g, "&apos;");
}

/**
 * Converts a JavaScript object to an XML string recursively with robust tag name sanitization.
 * @param {object} obj The object to convert.
 * @returns {string} The resulting XML string.
 */
function objectToXml(obj) {
    let xml = '';
    for (const key in obj) {
        if (!obj.hasOwnProperty(key) || typeof obj[key] === 'undefined' || obj[key] === null) continue;

        // --- START OF NEW, MORE ROBUST FIX ---
        // 1. Sanitize the key to create a valid XML tag name.
        //    Replace all invalid characters with an underscore. This is stricter and safer.
        let tagName = key.replace(/[^a-zA-Z0-9_]/g, '_');
        
        // 2. XML tag names cannot start with a number or be just an underscore.
        //    If the sanitized name is invalid, prepend a safe string.
        if (!/^[a-zA-Z_]/.test(tagName) || tagName === '_') {
            tagName = 'key_' + tagName;
        }
        // --- END OF NEW, MORE ROBUST FIX ---

        xml += `<${tagName}>`;
        const value = obj[key];
        
        if (Array.isArray(value)) {
            value.forEach(item => {
                // Use a consistent wrapper for all array items for simpler parsing.
                const itemTagName = 'item'; 
                xml += `<${itemTagName}>`;
                if (typeof item === 'object' && item !== null) {
                    xml += objectToXml(item);
                } else {
                    xml += escapeXml(String(item));
                }
                xml += `</${itemTagName}>`;
            });
        } else if (typeof value === 'object') {
            xml += objectToXml(value);
        } else {
            xml += escapeXml(String(value));
        }
        xml += `</${tagName}>`;
    }
    return xml;
}

/**
 * Saves an array of project objects to a complete XML string.
 * @param {Array<object>} projects The array of project objects.
 * @returns {string} The complete XML document as a string.
 */
function saveProjectsToXmlString(projects) {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<database>\n';
    projects.forEach(project => {
        xml += `  <project>${objectToXml(project)}</project>\n`;
    });
    xml += '</database>';
    return xml;
}

/**
 * Parses an XML string and converts it into an array of JavaScript objects.
 * @param {string} xmlString The XML string to parse.
 * @returns {Array<object>|null} An array of project objects, or null on error.
 */
function loadProjectsFromXmlString(xmlString) {
    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, "application/xml");
        
        const errorNode = xmlDoc.querySelector("parsererror");
        if (errorNode) {
            console.error("XML Parsing Error:", errorNode.textContent);
            // alert("Failed to parse XML file. Please check the console for details. The file may be corrupted or in an old format.");
            return null;
        }

        // List of keys that should always be treated as arrays, even if they only have one child in the XML.
        const arrayTags = [
            'invoices', 'items', 'feeMilestones', 'boq', 'mom', 'siteFiles', 
            'masterDocuments', 'paymentCertificates', 'scheduleTasks', 'vendors'
        ];

        const xmlNodeToJs = (node) => {
            // Text node
            if (node.nodeType === 3) return node.nodeValue.trim();
            // Not an element
            if (node.nodeType !== 1) return null;

            // Element with only text content
            if (node.childNodes.length === 1 && node.childNodes[0].nodeType === 3) {
                const textContent = node.textContent.trim();
                if (textContent === 'true') return true;
                if (textContent === 'false') return false;
                // A safer check for numbers that avoids converting long IDs or version strings
                if (!isNaN(Number(textContent)) && textContent !== '' && !/\s/.test(textContent) && textContent.length < 15) {
                    return Number(textContent);
                }
                return textContent;
            }

            let data = {};
            for (const child of node.childNodes) {
                if (child.nodeType !== 1) continue;
                
                let nodeName = child.nodeName;
                
                // Reverse the sanitization for keys that were prepended
                if (nodeName.startsWith('key_')) {
                    nodeName = nodeName.substring(4);
                }
                
                const childData = xmlNodeToJs(child);

                if (data.hasOwnProperty(nodeName)) {
                    if (!Array.isArray(data[nodeName])) {
                        data[nodeName] = [data[nodeName]]; 
                    }
                    data[nodeName].push(childData);
                } else {
                    data[nodeName] = childData;
                }
            }

            // This simplifies arrays like <invoices><item>...</item></invoices> into a simple 'invoices' array.
            for (const key in data) {
                 if (data[key] && typeof data[key] === 'object' && !Array.isArray(data[key]) && data[key].item && Object.keys(data[key]).length === 1) {
                    data[key] = Array.isArray(data[key].item) ? data[key].item : [data[key].item];
                }
            }
            return data;
        };

        const projects = [];
        const rootElement = xmlDoc.documentElement.nodeName;
        const itemTag = (rootElement === 'database' || rootElement === 'projects') ? 'project' : 'update';

        const itemNodes = xmlDoc.getElementsByTagName(itemTag);
        for (const node of itemNodes) {
            let projectData = xmlNodeToJs(node);
            
            // Post-process to ensure specified fields are arrays for data consistency
            arrayTags.forEach(tag => {
                if (projectData.hasOwnProperty(tag)) {
                    // If it exists but isn't an array (because it had only one child), wrap it in an array
                    if (projectData[tag] && !Array.isArray(projectData[tag])) {
                        projectData[tag] = [projectData[tag]];
                    }
                } else {
                    // If the tag doesn't exist in the XML, create an empty array for consistency
                    projectData[tag] = [];
                }
            });
            
            projects.push(projectData);
        }

        return projects;
    } catch(e) {
        console.error("Critical error in XML parser:", e);
        return null;
    }
}