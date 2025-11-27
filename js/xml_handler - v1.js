// ===================================================================================
// MODULE 2: XML & DATA HANDLERS
// ===================================================================================

function escapeXml(unsafe) {
    if (typeof unsafe !== 'string') return unsafe;
    return unsafe.replace(/[<>&'"]/g, c => ({
        '<': '<', '>': '>', '&': '&', '\'': '\'', '"': '"'
    })[c]);
}

function objectToXml(obj) {
    let xml = '';
    for (const key in obj) {
        if (!obj.hasOwnProperty(key)) continue;
        const tagName = /^[0-9]/.test(key) || key.includes('.') ? `s_${key.replace(/\./g, '_')}` : key;
        xml += `<${tagName}>`;
        const value = obj[key];
        if (Array.isArray(value)) {
            value.forEach(item => { 
                if (typeof item === 'object' && item !== null) {
                    xml += `<item>${objectToXml(item)}</item>`
                } else {
                    xml += `<item>${escapeXml(String(item || ''))}</item>`
                }
            });
        } else if (typeof value === 'object' && value !== null) {
            xml += objectToXml(value);
        } else {
            xml += escapeXml(String(value || ''));
        }
        xml += `</${tagName}>`;
    }
    return xml;
}

function saveProjectsToXmlString(projects) {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<database>\n';
    projects.forEach(project => { xml += `  <project>${objectToXml(project)}</project>\n`; });
    xml += '</database>';
    return xml;
}

function loadProjectsFromXmlString(xmlString) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "application/xml");
    if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
        console.error("Error parsing XML:", xmlDoc.getElementsByTagName("parsererror")[0].innerText);
        return null;
    }
    const projects = [];
    const projectNodes = xmlDoc.getElementsByTagName('project');
    const xmlNodeToJs = (node) => {
        if (node.nodeType === 1 && node.childNodes.length === 1 && node.childNodes[0].nodeType === 3) {
            const textContent = node.textContent;
            if (textContent === 'true') return true;
            if (textContent === 'false') return false;
            return textContent;
        }
        let data = {};
        if (node.hasChildNodes()) {
            for (const child of node.childNodes) {
                if (child.nodeType !== 1) continue;
                let nodeName = child.nodeName;
                if (nodeName.startsWith('s_')) {
                    nodeName = nodeName.substring(2).replace(/_/g, '.');
                }
                const childData = xmlNodeToJs(child);
                if (data[nodeName]) {
                    if (!Array.isArray(data[nodeName])) {
                        data[nodeName] = [data[nodeName]];
                    }
                    data[nodeName].push(childData);
                } else {
                    data[nodeName] = childData;
                }
            }
        } else {
            return node.textContent;
        }
        if ((node.nodeName === 'invoices' || node.nodeName === 'items') && data.item) {
             return Array.isArray(data.item) ? data.item : [data.item];
        }
        return data;
    };
    for (const node of projectNodes) {
        projects.push(xmlNodeToJs(node));
    }
    return projects;
}