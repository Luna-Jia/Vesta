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
            <div class="col-md-4">
                <label for="propertySelect${workspaceCount}" class="form-label">Select map property:</label>
                <select id="propertySelect${workspaceCount}" class="form-select propertySelect"></select>
            </div>
            <div class="col-md-4">
                <label for="histogramPropertySelect${workspaceCount}" class="form-label">Select histogram property:</label>
                <select id="histogramPropertySelect${workspaceCount}" class="form-select histogramPropertySelect"></select>
            </div>
        </div>
        </div>
        <div class="row">
            <div class="col-md-6">
                <div id="map${workspaceCount}" class="map"></div>
            </div>
            <div class="col-md-6">
                <div id="histogram${workspaceCount}" class="histogram"></div>
            </div>
        </div>
        <div class="row">
            <div class="col-md-12">
                <div id="tableContainer${workspaceCount}" class="tableContainer"></div>
            </div>
        </div>
    `;
    document.getElementById('workspaceContents').appendChild(newContent);

    workspaceData[workspaceCount] = { geojson: null, map: null, histogram: null };

    attachWorkspaceListeners(newWorkspace);
    switchToWorkspace(workspaceCount).then(() => {
        // Any additional actions after switching workspace
    });
}

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

function populatePropertySelect(properties) {
    const propertySelectContainer = document.getElementById(`propertySelectContainer${currentWorkspace}`);
    const histogramPropertySelectContainer = document.getElementById(`histogramPropertySelectContainer${currentWorkspace}`);
    propertySelectContainer.innerHTML = '';
    histogramPropertySelectContainer.innerHTML = '';

    // Create and populate map property select
    const mapLabel = document.createElement('label');
    mapLabel.htmlFor = `propertySelect${currentWorkspace}`;
    mapLabel.className = 'form-label';
    mapLabel.textContent = 'Select map property:';
    propertySelectContainer.appendChild(mapLabel);

    const mapSelect = document.createElement('select');
    mapSelect.id = `propertySelect${currentWorkspace}`;
    mapSelect.className = 'form-select propertySelect';

    // Create and populate histogram property select
    const histogramLabel = document.createElement('label');
    histogramLabel.htmlFor = `histogramPropertySelect${currentWorkspace}`;
    histogramLabel.className = 'form-label';
    histogramLabel.textContent = 'Select histogram property:';
    histogramPropertySelectContainer.appendChild(histogramLabel);

    const histogramSelect = document.createElement('select');
    histogramSelect.id = `histogramPropertySelect${currentWorkspace}`;
    histogramSelect.className = 'form-select histogramPropertySelect';

    for (let prop in properties) {
        if (typeof properties[prop] === 'number') {
            let mapOption = document.createElement('option');
            mapOption.value = prop;
            mapOption.textContent = prop;
            mapSelect.appendChild(mapOption);

            let histogramOption = document.createElement('option');
            histogramOption.value = prop;
            histogramOption.textContent = prop;
            histogramSelect.appendChild(histogramOption);
        }
    }

    mapSelect.addEventListener('change', function() {
        if (workspaceData[currentWorkspace].geojson) {
            renderColorfulMap(workspaceData[currentWorkspace].geojson);
        }
    });

    histogramSelect.addEventListener('change', function() {
        if (workspaceData[currentWorkspace].geojson) {
            renderHistogram();
        }
    });

    propertySelectContainer.appendChild(mapSelect);
    histogramPropertySelectContainer.appendChild(histogramSelect);

    // Trigger change events to render the map and histogram with the first properties
    mapSelect.dispatchEvent(new Event('change'));
    histogramSelect.dispatchEvent(new Event('change'));
}

// Add workspace-related event listeners
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('addWorkspace').addEventListener('click', addWorkspace);
    attachWorkspaceListeners(document.getElementById('workspace1'));
});