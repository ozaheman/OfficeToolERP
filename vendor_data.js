/**
 * @const VENDOR_LIST
 * A comprehensive database of approved vendors and suppliers, categorized by work type.
 * Transcribed from the project specification document.
 */
const VENDOR_LIST = {
    "Structural Work Items": [
        { item: "Cement Concrete Blocks", manufacturers: ["Juma Al Majid, Dubai", "Emcon LLC", "Arabia Concrete Products Company", "Consent LLC", "National Concrete Products Company", "Phoenix Concrete Products", "or similar"] },
        { item: "Readymix Concrete", manufacturers: ["Readymix Beton, Dubai", "Conmix Ltd, Dubai", "Topmix Ltd, Dubai", "Arabian Readymix, Dubai", "Unimix, Dubai", "Trimix, Dubai", "National Readymix, Dubai", "or similar"] },
        { item: "Foam Concrete", manufacturers: ["Foamcem Al Nahda Contracting & Trading Co., Dubai", "Isocrete Ltd. Al Shirawi Contracting & Trading Co., Dubai", "Canfoam of BCR (UK)Emirates Specialities, Dubai"] },
        { item: "Polythene Sheets", manufacturers: ["Kangaroo Plastics, Dubai", "or similar."] },
        { item: "Geotextile – Filter membrane", manufacturers: ["Typar by Du Pont Al Nahda Contracting & Trading, Dubai", "Polyfelt (Austria) Emirates Specialities, Dubai", "Or similar"] },
        { item: "Extruded Rigid Polystyrene Boards (Density 32-36 kg/m3)", manufacturers: ["Roofmate by Dow Chemical Cloisall Chemical Co, Dubai", "ESSCO FORM by Energy Saving Systems, Kuwait", "Or similar"] },
        { item: "Protection Board", manufacturers: ["Henkel Polybit", "Texmastic Int. (USA)", "Fosroc, Dubai", "DWI Dermabit", "or similar"] },
        { item: "Waterproofing Roofing", manufacturers: ["Roof Care", "or equivalent"] },
        { item: "Water Stops", manufacturers: ["Fosroc - Al Gurg Fosroc Pvt. Ltd. Dubai", "Sultaco, Dubai", "Tricosal-Emirates Specialities Co., Dubai", "or as described in material specifications"] },
        { item: "Sodium Silicate Floor Hardener", manufacturers: ["DPH Cormix Middle East, Dubai", "Nito Fllor Lithurin Al Gurg Fosroc Pvt. Ltd. Dubai", "BCR Liquid Emirates Specialities, Dubai", "Fosroc Pvt. Ltd. Dubai", "MAPEI", "or similar to approval"] },
        { item: "Liquid applied Damp Proof Coating (for substructure)", manufacturers: ["Forsoc, Dubai", "Kellbid, Dubai", "Emirates Specialities Co., Dubai", "FEB Master Buildesr, Dubai", "MAPEI", "Or similar"] },
        { item: "Fire Stops Sealants", manufacturers: ["Nullifire Fire Protection", "A.P.S. Trading Division, Dubai", "Hilti", "M.E.T, Dubai", "Dow Corning", "Tremco", "Or similar"] },
        { item: "Reinforcement M.S. Bars", manufacturers: ["Qatar Steel Co. or equivalent approved.", "Saudi Steel Co.", "Turkey-from ISO approved Companies only", "Emirates Steel"] },
        { item: "Mineral Wool", manufacturers: ["Fujairah Rockwool", "Or similar"] },
        { item: "Pre-Cast Concrete Manufacturers", manufacturers: ["Emirates Precast Construction Est., Dubai", "United Precast Concrete, Dubai", "Gulf Precast, Dubai"] },
        { item: "SBS Waterproofing Bituminous Membrane", manufacturers: ["Henkel Polybit", "Texmastic Int. (USA)", "Fosroc, Dubai", "DWI Dermabit", "Hela", "Testudo", "Derbigum", "or similar"] },
        { item: "Antiroot Waterproofing to floor Boxes", manufacturers: ["Henkel Polybit", "Texmastic Int. (USA)", "Fosroc, Dubai", "DWI Dermabit", "or similar"] },
        { item: "Epoxy Coating", manufacturers: ["Nitofloor FC 140 Al Gurg Fosroc Pvt. Ltd., Dubai", "Rezex EP Cormix, Middle East, Dubai", "MAPEI", "Caprol", "Jotun", "or similar"] },
        { item: "Pitch Extended Epoxy Coating", manufacturers: ["Nitoflor FC 140 Al Gurg Fosroc Pvt. Ltd. Dubai", "Cormix Sureseal PE11", "Cormix Middle East, Dubai", "MAPEI", "or similar"] },
        { item: "Sealants", manufacturers: ["Tremco Limited Middle East", "Emirates Specialties", "MAPEI", "or similar"] },
        { item: "Liquid Waterproofing Membrane (Polyurethane Rubber)", manufacturers: ["Master Builder", "Dr Fixit", "MAPEI", "FOSROC", "Treloflex by Tremco UBM, Dubai", "Testudo", "Or similar"] },
        { item: "Antitermite Treatment (“DURSBAN” or similar with 20 Years Guarantee)", manufacturers: ["East Coast Pest Control Services Dubai", "Dubai Pest Company, Dubai", "Rida Pest Control, Dubai", "Or similar to approval provided the company carries EHCC approval"] },
        { item: "Damp proof Membrane Hessian based type – A,3 mm thick", manufacturers: ["Sibetasto by Al Nahda Cont. Trading, Dubai", "Adeprimaire by Siplast, Dubai", "Emirates Specialities Co. LLC", "Pluvex", "Or similar"] },
        { item: "Hollow and Solid Concrete Block", manufacturers: ["To confirm to local order No.44 for year 1990 and Adm. Order No. 108/90 and 171/90. Refer specification manufacturer to approval"] },
        { item: "Leveling Compounds", manufacturers: ["Rezex R511 by Cormix Cormix Middle East, Dubai", "Nitoflor Leveltop GP by Fosroc Al Gurg Fosroc Pvt. Ltd, Dubai", "BCR Leveling Compound Emirates Specialities, Dubai", "Or similar"] },
        { item: "Curing", manufacturers: ["Curing compound is subject to written approval. Curing compound not to be WAX based, unless specific approval is granted in writing."] },
        { item: "Post Tension Slab Works", manufacturers: ["Northern Territory – Australia", "Freyssinet – France", "Emirates Strong Force – Australia", "CCL - Darwish Haddad", "Interspan", "or equivalent"] },
        { item: "Piling Works", manufacturers: ["Swiss Boring", "Dutch Foundation", "Middle East Foundation", "N.S.C.C.", "Al Gurair Arabian Foundation Engineering", "SSLootah Foundations", "Stromek"] }
    ],
    "Metal Work, Glazing & Joinery": [
        { item: "Plastic Laminate", manufacturers: ["Formica Al FalahBuilding Materials, Dubai", "Perstop Emirates Trading Agency, Dubai", "or similar"] },
        { item: "Kitchen Cabinets (Sandwich metal panels)", manufacturers: ["Al Maidoor Metal Inds. Dubai", "Gulf Precision Metals, Dubai", "Armita Metal Inds. Dubai", "Shafiq Dagher, Dubai", "or similar"] },
        { item: "Cubicle Partitions", manufacturers: ["Trespa", "Gibca Furniture Industry Co. Ltd (LLC)", "ETA", "or similar to approval"] },
        { item: "Aluminum Works", manufacturers: ["Arabian Aluminum Co", "Cornish Aluminum Contracting Co.", "Metalu", "Alico", "Euro Systems or equivalent"] },
        { item: "Steel Doors & Frames", manufacturers: ["Curries (USA), Steelcraft (USA) Bin Ghurair Trading, Dubai", "Martin Roberts Guardian (UK) Aseel Construction Services, Dubai", "Republic of Builder Products (USA) Desert Roofing & Flooring Co., Dubai", "Novoferm, Germany – Door Type Supercolour Range Bin Ghurair Trading, Dubai", "Horman Door, Germany Karcher Trading, Dubai", "M/s Dosteen General Trading LLC", "M/s Crawford Middle East", "or similar"] },
        { item: "Ladder, handrails & Balustrades", manufacturers: ["Alico Aluminum & Light Industries", "Arabian Aluminum Co.", "Euro Systems", "Cornish Aluminum", "Al Abbar Aluminum", "or equivalent"] },
        { item: "Mirrors", manufacturers: ["Al Abbar Architectural Glass", "Al Sabi Glass & mirrors", "Or equivalent"] },
        { item: "Glass", manufacturers: ["Libbey Owens Ford INTRACO (UAE) Ltd., Dubai", "Glaverbel Gutal, Dubai", "Emirates Glass, Dubai", "Guardien Glass, Dubai", "Saint Gobain, Merint, Dubai", "Or equivalent"] },
        { item: "Carpentry & Joinery including counters and countertop", manufacturers: ["Bertolini", "ETA Alpha star", "Ugarit International", "Starwood", "Ajman Korea Furniture & Timber co.", "Or equivalent"] },
        { item: "Ironmongery", manufacturers: ["Silver Shore Trading Co., Dubai JADO-solid stainless steel", "Haroon Co. W.L.L.", "Consort Hardware", "Dorma-Germany", "Hafele - Dubai", "Assa Abloy"] },
        { item: "Mechanical Fixing Systems", manufacturers: ["Hilti Mazrui Engineering Products", "EuroLink", "or equivalent"] },
        { item: "Garbage chute", manufacturers: ["Standard Steel Manufacturing Co.", "Hi-Tech Equipment LLC"] },
        { item: "Garbage Trolleys", manufacturers: ["MKT & Sons", "WMS Metal Industries", "Ostermeier FZE", "or equivalent"] },
        { item: "Corian Vanity counters", manufacturers: ["Royal Star Solid Surfaces LLC", "Denolex Polymers LLC", "Baydun International General Trading", "SurfaceTech LLC", "or equivalent"] },
        { item: "Rubberized sports flooring", manufacturers: ["Polytan - Germany", "Stockmeier Urethanes – Germany", "Rephouse – Malaysia", "MONDO- USA", "CARL FREUNDENBERG -Germany"] }
    ],
    "Suspended Ceiling & Decoration": [
        { item: "0.7mm thick Perforated and non-perforated aluminum ceiling 600x600", manufacturers: ["Batimat", "Burges (DEKO)", "Cloissal (DARMA)", "FederalBuilding Industries (Hunter Douglas)", "Al SemsamBuilding Materials Geipel (Germany)", "Sadi Metals by Projects and Supplies"] },
        { item: "Internal Ceilings: Calcium Silicate", manufacturers: ["Daiken from Japan Supplied by GIBCA or equivalent approval"] },
        { item: "Moisture Resistant Gypsum Board Ceiling", manufacturers: ["Moisture resistant 12mm thick plasterboard as supplied by M/s. Mac Al Gurg or similar approved manufacturer"] },
        { item: "External Ceiling: ACM Panel ceiling", manufacturers: ["ALPOLIC-Japan", "Reynobond –U S A", "Alucobond – Germany", "or equivalent"] },
        { item: "0.7mm thick polyester powder coated strip ceiling", manufacturers: ["LUXALON from FBI or equivalent approval"] }
    ],
    "Floor, Wall & Ceiling Finishes": [
        { item: "Marble & Granites – Supply or Supply and Fix", manufacturers: ["Al Naboodah Gypsum & Marble, Dubai", "Union Mosiac & Marble Co, Dubai", "Al Habtoor Marble Co LLC,Dubai", "Terrazzo, Dubai", "Al Shafar Tile Factory, Dubai", "Carara Marble, Dubai"] },
        { item: "Ceramic tiles for floors and walls", manufacturers: ["Buchtal Tile co. supplied by Solico, Dubai", "H & R johnstone Ltd. Dubai, UAE supplied by Al Shaya.", "Graniti Fiandre as supplied by Al Falah", "Marazzi as supplied by Surfaces, Dubai", "Gouccera/Imola as supplied by Al Shaya", "RAK ceramics."] },
        { item: "Polished precast terrazzo tiles", manufacturers: ["Satwa Automatic Mosiac Tiles, Dubai", "Terazzo ME, Dubai", "Al Shafar, Dubai", "Gulf Tiles, Dubai"] },
        { item: "PVC Floor tiles and skirting", manufacturers: ["Marley Sultaco, Dubai", "Armstrong, Dubai", "Tarkett Pax-Kent Int'l, Dubai", "or equal to approval"] },
        { item: "Rubber floor tiles & skirting 3.2mm thick heavy duty", manufacturers: ["“MONDO” supplied by Peninsula Building Materials, Dubai", "CARL FREUNDENBERG” by Sultaco, Dubai", "or equal to approval"] },
        { item: "Graniti Ceramic (Porcelain Tiles)", manufacturers: ["AL Falah – Graniti Fiandre", "Surfaces – Dubai – Marrazzi Nexus", "Gouccera/Imola as supplied by Al Shaya", "Local Products Al Khaleej Ceramic– Dubai", "RAK Ceramic Factory – Dubai", "Vitra as supplied by CM1"] },
        { item: "Proprietory Plaster to walls & ceilings", manufacturers: ["Conmix", "Mega Coat", "Hitec"] },
        { item: "Tile adhesive and Tile grouts", manufacturers: ["Fosroc", "MAPEI", "BASF", "MBT", "or equivalent"] },
        { item: "Raised Access Floors", manufacturers: ["Mideast Data Systems", "FederealBuilding Inds.", "Gulf Computer Support System (L.L.C)", "Fredenberg", "Armstrong"] },
        { item: "Dry Wall Partition", manufacturers: ["Saint-Gobain Gyproc Middle East", "Gypsemna"] }
    ],
    "Paints & Decoration": [
        { item: "External Paint System", manufacturers: ["Jotun, UAE, Dubai", "Berger Paint, Dubai", "Caprol", "Sigma", "Emirates Tex-cote"] },
        { item: "Internal Paint System for walls, ceilings etc.", manufacturers: ["Jotun U.A.E., Dubai", "Berger Paint, Dubai", "Caparol- Dubai", "Sigma Paints"] },
        { item: "Paint for wood work", manufacturers: ["Jotun U.A.E., Dubai", "Berger Paint, Dubai", "Caparol-Dubai", "Sadolin"] },
        { item: "Stone paint with polyurethane top coat", manufacturers: ["Caparol, Dubai", "Berger Paint, UAE, Dubai", "Emirates Tex-Coat"] },
        { item: "Epoxy paint on structural steel work", manufacturers: ["Jotun Paints", "Sigma Paints", "Berger Paint, Dubai", "Hempel Paints, Dubai"] },
        { item: "Car Park Floor (Non Solvent Epoxy Paint System)", manufacturers: ["BASF", "Flowcrete", "Fosroc", "Emirates Specialties", "Caparol"] }
    ],
    "Structural Steel Work & Roofing": [
        { item: "Structural Steel Work", manufacturers: ["Emirates Trading Agency, Dubai", "Tiger Steel Eng'g, Dubai", "Standard Fabricators, Dubai", "Emirates Building Services, Dubai", "Galadari Engineering, Dubai", "Al Banna Engineering Works, Dubai", "ECC steel Fabricators"] }
    ],
    "Paving, Kerbs & Road Work": [
        { item: "Interlock Tiles", manufacturers: ["Juma Al Majid Conc. Products, Dubai", "Emirates Stone, Dubai", "Transgulf Concrete Products", "Contech Concrete Products"] },
        { item: "Precast hydraulically pressed kerbs stones & Flush kerbs", manufacturers: ["Precon, Dubai", "GermanGulf Concrete Products, Dubai", "Royal Concrete Products, Dubai", "Contech or similar to approval"] },
        { item: "Road Work", manufacturers: ["Al Mulla Construction, Dubai", "National Wheel J&P Co, Dubai", "Dutco, Dubai", "Al Naboodah Cont. Co., Dubai", "Khansaheb, Dubai", "Bartawi, Dubai", "UTCC Wade Adams, Dubai"] },
        { item: "Road signs, information signs", manufacturers: ["Joseph Advertising, Dubai", "Giffin Road Signs, Dubai", "Electro Industries", "Adventrix", "Or similar"] },
        { item: "Road Marking Paint (Thermoplastic)", manufacturers: ["Prismo", "Jeap", "Or similar to approval"] },
        { item: "Paint for Kerb", manufacturers: ["Jotun Paints, Dubai", "Berger Paints, Dubai"] },
        { item: "Soft Landscaping", manufacturers: ["Orient Irrigation Services", "Desert Landscape Co.", "Al Bayader Irrigation & Contractiing", "Akar Technical Services", "Gulf Landscaping & irrigation"] },
        { item: "Testing Laboratories", manufacturers: ["Foundation Engineering, Dubai", "Fuguro ME, Dubai", "Al Futtaim Bodycote, Dubai", "Al Holy & Stagner, Dubai", "Technical Laboratory, Dubai", "DubaiMunicipality."] },
        { item: "External Road / Pavement as approved by RTA", manufacturers: ["Al Wasit Road Contracting Co.", "Wagner Biro Bin Butti Engineering", "Al Bahar & Al Bardawil W.L.L.", "Dicotech", "Al ManaderBuilding Maintenance", "Any other RTA approved Contractor."] }
    ],
    "MEP Works": [
        { item: "MEP Contractor", manufacturers: ["Transgulf Electo-mechanical LLC", "Bilt Middle East", "International Electo-mechanical LLC", "Trinity engineering services", "Al Futtaim Engineering.", "Jamheer Contracting Co", "Semco", "Electromec"] }
    ],
    "Building Management Unit": [
        { item: "Building Management Unit (Window cleaning)", manufacturers: ["Xs Platforms, Germany", "EW Cox Middle East, Australia", "ETA Melco, AESA –Spain", "Transwill Engineering LLC", "Danway, UAE"] }
    ],
    "Equipments/Pool": [
        { item: "Lift", manufacturers: ["Thyssenkrup", "OTIS", "MITSUBISHI", "Kone Middle East LLC", "Schindler"] }
    ],
    "Miscellaneous": [
        { item: "Entrance Floor Mats", manufacturers: ["C/S Group Middle East", "Emirates Specialities", "Peninsula International General Trading"] },
        { item: "Speed reduction Ramps", manufacturers: ["Shreeji Trading Co. LLC", "Tulip Trading Co. LLC", "Middle east rubber manufacture LLC", "Peninsula International General Trading"] },
        { item: "Column Corner Guards", manufacturers: ["Shreeji Trading Co.", "Middle east rubber manufacture LLC", "Ocean rubber factory", "Peninsula International General Trading"] },
        { item: "Fixing Adhesives", manufacturers: ["Hilti Mazrui Engineering Products"] },
        { item: "Access panel", manufacturers: ["M/s. Al Falah Building Materials and Trading Company, Dubai", "M/s. Refrance International", "or other equal and approved"] },
        { item: "Sanitary Ware and Accessories", manufacturers: ["Armitage Shanks UK supplied by Mac Al Gurg, Dubai", "Twyford, UK supplied by Faraidooni, Dubai", "Ideal standard supplied by Sultaco, Dubai", "VITRA-CMI", "Villeroy - Boch - Sara", "Kerameg (Germany)Al Shaya", "Duravit"] },
        { item: "Mixers", manufacturers: ["Grohe", "Kludi", "Mamoodi", "Armitage shanks", "Vitra", "or equivalent"] },
        { item: "Signage Contractor", manufacturers: ["Electro Industries", "Joseph Advertisers", "Exact Signs", "Blue Rhine", "City Liner", "Golden Neon."] },
        { item: "Aluminum composite panels", manufacturers: ["ALPOLIC - Japan", "Reynobond -USA", "Alucobond - Germany", "or similar material"] },
        { item: "GRP Trash Bin", manufacturers: ["Blue steam trading", "RT trading Est.", "or similar to approval"] },
        { item: "Glass Reinforced Polymer (GRC)", manufacturers: ["German Tech Fiber Glass Industries", "Terrazzo Ltd.", "Trade Circle Technical Industries (TCTI)", "Juma Al majid"] },
        { item: "Glass Reinforced Polymer (GRP)", manufacturers: ["Terrazzo Ltd.", "Trade Circle Technical Industries (TCTI)"] },
        { item: "Spray Plaster", manufacturers: ["Hitek", "Tenaco", "Altek"] },
        { item: "Speed Humps", manufacturers: ["Middle East Rubber Manufacturer", "Peninsula International General Trading", "or similar to approval"] },
        { item: "Control Joints", manufacturers: ["Peninsula International General Trading", "or similar to approval"] },
        { item: "Dock Levelers", manufacturers: ["Crawford Middle East", "Dosteen General Trading LLC", "or similar to approval"] }
    ]
};