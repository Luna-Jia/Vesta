function addWorkspace() {
    workspaceCount++;
    const newWorkspace = document.createElement('div');
    newWorkspace.className = 'workspace';
    newWorkspace.id = `workspace${workspaceCount}`;
    newWorkspace.innerHTML = `
        <span class="workspace-name">Workspace ${workspaceCount}</span>
        <button class="close-workspace">&times;</button>
    `;
    document.getElementById('addWorkspace').before(newWorkspace);

    const newContent = document.createElement('div');
    newContent.className = 'workspace-content';
    newContent.id = `workspaceContent${workspaceCount}`;
    newContent.innerHTML = `
        <div class="row mb-3">
            <div class="col-md-6">
                <div id="propertySelectContainer${workspaceCount}"></div>
            </div>
            <div class="col-md-6">
                <div id="histogramControlsContainer${workspaceCount}" style="display: none;">
                    <label for="histogramPropertySelect${workspaceCount}" class="form-label">Select Histogram Property:</label>
                    <select id="histogramPropertySelect${workspaceCount}" class="form-control"></select>
                    <div class="mt-2">
                        <label for="histogramBins${workspaceCount}" class="form-label">Number of Bins:</label>
                        <input type="number" id="histogramBins${workspaceCount}" class="form-control" min="1" value="10">
                    </div>
                </div>
            </div>
        </div>
        <div class="row">
            <div class="col-md-6">
                <div id="map${workspaceCount}" class="map">
                    <div class="map-tools-container" style="display: none;">
                        <button id="handIcon${workspaceCount}" class="map-icon" aria-label="Hand tool" title="Hand tool">
                            <i class="fas fa-hand-paper"></i>
                        </button>
                        <button id="cursorIcon${workspaceCount}" class="map-icon" aria-label="Cursor tool" title="Cursor tool">
                            <i class="fas fa-mouse-pointer"></i>
                        </button>
                        <button id="telescopeIcon${workspaceCount}" class="map-icon" aria-label="Toggle feature popups" title="Toggle feature popups" onclick="toggleFeaturePopups(${workspaceCount})">
                            <i class="fas fa-binoculars"></i>
                        </button>
                    </div>
                    <button id="settingsIcon${workspaceCount}" class="map-icon settings-icon" aria-label="Settings" title="Settings" onclick="openSettingsModal()" style="display: none;">
                        <i class="fas fa-cog"></i>
                    </button>
                </div>
            </div>
            <div class="col-md-6">
                <div class="row">
                    <div class="col-md-8">
                        <div id="histogram${workspaceCount}" class="histogram"></div>
                    </div>
                    <div class="col-md-4">
                        <div id="histogramStats${workspaceCount}" class="histogram-stats" style="display: none;">
                            <h5>Statistics</h5>
                            <ul>
                                <li>Count: <span id="statCount${workspaceCount}"></span></li>
                                <li>Minimum: <span id="statMin${workspaceCount}"></span></li>
                                <li>Maximum: <span id="statMax${workspaceCount}"></span></li>
                                <li>Mean: <span id="statMean${workspaceCount}"></span></li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="row mt-3">
            <div class="col-md-12">
                <div id="tableContainer${workspaceCount}" class="tableContainer"></div>
            </div>
        </div>
    `;
    document.getElementById('workspaceContents').appendChild(newContent);

    workspaceData[workspaceCount] = { 
        geojson: null, 
        map: null, 
        histogram: null, 
        geoJsonLayer: null,
        legend: null,
        min: null,
        max: null,
        highlightedFeatures: new Set()
    };

    attachWorkspaceListeners(newWorkspace);
    switchToWorkspace(workspaceCount).then(() => {
        // Any additional actions after switching workspace
    });
}

// ------------------------------------------------------------------------------------------------------------------------------------

function switchToWorkspace(workspaceId) {
    return new Promise((resolve) => {
        document.querySelectorAll('.workspace').forEach(w => w.classList.remove('active'));
        document.querySelectorAll('.workspace-content').forEach(w => w.classList.remove('active'));
        
        document.getElementById(`workspace${workspaceId}`).classList.add('active');
        document.getElementById(`workspaceContent${workspaceId}`).classList.add('active');
        
        currentWorkspace = workspaceId;

        // Initialize map if it doesn't exist
        if (!workspaceData[workspaceId].map) {
            const mapContainer = document.getElementById(`map${workspaceId}`);
            if (mapContainer) {
                workspaceData[workspaceId].map = L.map(`map${workspaceId}`).setView([0, 0], 2);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap contributors'
                }).addTo(workspaceData[workspaceId].map);
            } else {
                console.error(`Map container not found for workspace ${workspaceId}`);
            }
        }

        // Use setTimeout to ensure the map is fully initialized
        setTimeout(() => {
            resolve();
        }, 100);
    });
}

// ------------------------------------------------------------------------------------------------------------------------------------

function attachWorkspaceListeners(workspace) {
    workspace.addEventListener('click', function() {
        switchToWorkspace(this.id.replace('workspace', ''));
    });

    workspace.querySelector('.close-workspace').addEventListener('click', function(e) {
        e.stopPropagation();
        if (document.querySelectorAll('.workspace').length > 1) {
            const workspaceId = workspace.id.replace('workspace', '');
            document.getElementById(`workspaceContent${workspaceId}`).remove();
            workspace.remove();
            delete workspaceData[workspaceId];
            switchToWorkspace(Object.keys(workspaceData)[0]);
        }
    });

    workspace.addEventListener('dblclick', function() {
        const nameSpan = this.querySelector('.workspace-name');
        const newName = prompt('Enter new workspace name:', nameSpan.textContent);
        if (newName) {
            nameSpan.textContent = newName;
        }
    });
}

// ------------------------------------------------------------------------------------------------------------------------------------

function populatePropertySelect(properties) {
    const propertySelectContainer = document.getElementById(`propertySelectContainer${currentWorkspace}`);
    propertySelectContainer.innerHTML = '';

    const mapLabel = document.createElement('label');
    mapLabel.htmlFor = `propertySelect${currentWorkspace}`;
    mapLabel.className = 'form-label';
    mapLabel.textContent = 'Select map property:';
    propertySelectContainer.appendChild(mapLabel);

    const mapSelect = document.createElement('select');
    mapSelect.id = `propertySelect${currentWorkspace}`;
    mapSelect.className = 'form-select propertySelect';

    for (let prop in properties) {
        if (typeof properties[prop] === 'number') {
            let option = document.createElement('option');
            option.value = prop;
            option.textContent = prop;
            mapSelect.appendChild(option);
        }
    }

    mapSelect.addEventListener('change', function() {
        if (workspaceData[currentWorkspace].geojson) {
            renderColorfulMap(workspaceData[currentWorkspace].geojson);
        }
    });

    propertySelectContainer.appendChild(mapSelect);

    // Trigger change event to render the map with the first property
    mapSelect.dispatchEvent(new Event('change'));
}
// ------------------------------------------------------------------------------------------------------------------------------------


function populateHistogramPropertySelect(properties) {
    const selectElement = document.getElementById(`histogramPropertySelect${currentWorkspace}`);
    if (!selectElement) {
        console.error(`Histogram property select element not found for workspace ${currentWorkspace}`);
        return;
    }

    selectElement.innerHTML = '';

    for (let prop in properties) {
        if (typeof properties[prop] === 'number') {
            const option = document.createElement('option');
            option.value = prop;
            option.textContent = prop;
            selectElement.appendChild(option);
        }
    }

    // If no options were added, add a default option
    if (selectElement.options.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'No numeric properties found';
        selectElement.appendChild(option);
    }
}

// ------------------------------------------------------------------------------------------------------------------------------------

// Add workspace-related event listeners
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('addWorkspace').addEventListener('click', addWorkspace);
    attachWorkspaceListeners(document.getElementById('workspace1'));
});