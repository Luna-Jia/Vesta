// Global variables
let workspaceCount = 1;
let currentWorkspace = 1;
let workspaceData = {
    1: { geojson: null, map: null, histogram: null }
};

function getColor(value, min, max) {
    const ratio = (value - min) / (max - min);
    const hue = (1 - ratio) * 60; // 60 for yellow, 0 for red
    return `hsl(${hue}, 100%, 50%)`;
}

function toggleSecondaryNav() {
    var secondarySidebar = document.getElementById("secondarySidebar");
    var importSection = document.getElementById("importSection");
    var main = document.getElementById("main");
    if (secondarySidebar.style.width === "12em") {
        secondarySidebar.style.width = "0";
        main.style.marginLeft = "3em"; // Just the width of the main sidebar
        importSection.style.display = "none";
    } else {
        secondarySidebar.style.width = "12em";
        main.style.marginLeft = "15em"; // 3em (main sidebar) + 12em (secondary sidebar)
    }
}

function readFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

function processShapefile() {
    const shpFile = document.getElementById('shpFile').files[0];
    const dbfFile = document.getElementById('dbfFile').files[0];

    if (!shpFile || !dbfFile) {
        alert('Please select both .shp and .dbf files');
        return;
    }

    Promise.all([readFile(shpFile), readFile(dbfFile)])
        .then(([shpBuffer, dbfBuffer]) => {
            shapefile.read(shpBuffer, dbfBuffer)
                .then(geojson => {
                    console.log('GeoJSON created successfully:', geojson);
                    workspaceData[currentWorkspace].geojson = geojson;
                    populateFileVariablesList(shpFile.name, geojson.features[0].properties);
                    alert('Files processed successfully. Click on Map button to view.');
                })
                .catch(error => {
                    console.error('Error processing shapefile:', error);
                    alert('Error processing shapefile. Please check the console for details.');
                });
        }).catch(error => {
            console.error('Error reading files:', error);
            alert('Error reading files. Please check the console for details.');
        });
}

function populateFileVariablesList(fileName, properties) {
    const fileNameElement = document.getElementById('fileName');
    const variableList = document.getElementById('variableList');
    const fileVariablesSection = document.getElementById('fileVariablesSection');
    const fileNameToggle = document.getElementById('fileNameToggle');

    fileNameElement.textContent = fileName;
    variableList.innerHTML = '';

    for (let prop in properties) {
        let li = document.createElement('li');
        li.textContent = prop;
        variableList.appendChild(li);
    }

    fileVariablesSection.style.display = 'block';

    // Add click event to toggle the list
    fileNameToggle.addEventListener('click', function() {
        variableList.style.display = variableList.style.display === 'none' ? 'block' : 'none';
        fileNameToggle.querySelector('i').classList.toggle('fa-chevron-down');
        fileNameToggle.querySelector('i').classList.toggle('fa-chevron-up');
    });
}

function showImportOptions() {
    var secondarySidebar = document.getElementById("secondarySidebar");
    var importSection = document.getElementById("importSection");
    var fileVariablesSection = document.getElementById("fileVariablesSection");
    var visualizationButtons = document.getElementById("visualizationButtons");
    var main = document.getElementById("main");

    // Show the secondary sidebar if it's not already visible
    if (secondarySidebar.style.width !== "12em") {
        secondarySidebar.style.width = "12em";
        main.style.marginLeft = "15em"; // Adjusted margin to account for both sidebars
    }

    // Show the import section and hide other sections
    importSection.style.display = "block";
    fileVariablesSection.style.display = "none";
    visualizationButtons.style.display = "none";
}

function showVisualizationOptions() {
    var secondarySidebar = document.getElementById("secondarySidebar");
    var importSection = document.getElementById("importSection");
    var fileVariablesSection = document.getElementById("fileVariablesSection");
    var visualizationButtons = document.getElementById("visualizationButtons");
    var main = document.getElementById("main");

    // Show the secondary sidebar if it's not already visible
    if (secondarySidebar.style.width !== "12em") {
        secondarySidebar.style.width = "12em";
        main.style.marginLeft = "15em";
    }

    // Show the visualization buttons and hide other sections
    importSection.style.display = "none";
    fileVariablesSection.style.display = "none";
    visualizationButtons.style.display = "block";
}