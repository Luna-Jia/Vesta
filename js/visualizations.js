let featurePopupsEnabled = false;
let currentNumericValues = [];

function toggleFeaturePopups(workspaceId) {
    const telescopeIcon = document.querySelector(`#telescopeIcon${workspaceId}`);
    featurePopupsEnabled = !featurePopupsEnabled;

    if (featurePopupsEnabled) {
        telescopeIcon.classList.add('active');
        enableFeaturePopups(workspaceId);
    } else {
        telescopeIcon.classList.remove('active');
        disableFeaturePopups(workspaceId);
    }
}

function enableFeaturePopups(workspaceId) {
    const geoJsonLayer = workspaceData[workspaceId].geoJsonLayer;

    if (geoJsonLayer) {
        geoJsonLayer.eachLayer(function(layer) {
            layer.unbindTooltip();
            if (layer.feature && layer.feature.properties) {
                const popupContent = Object.entries(layer.feature.properties)
                    .filter(([key]) => key !== 'originalStyle') // Exclude originalStyle
                    .map(([key, value]) => `<strong>${key}:</strong> ${value}`)
                    .join('<br>');
                layer.bindTooltip(popupContent, {sticky: true});
            }
        });
    }
}

function disableFeaturePopups(workspaceId) {
    const geoJsonLayer = workspaceData[workspaceId].geoJsonLayer;

    if (geoJsonLayer) {
        geoJsonLayer.eachLayer(function(layer) {
            layer.unbindTooltip();
        });
    }
}

function renderColorfulMap(geojson) {
    const propertyName = document.getElementById(`propertySelect${currentWorkspace}`).value;
    const map = workspaceData[currentWorkspace].map;

    if (!map) {
        console.error('Map not initialized for workspace', currentWorkspace);
        return;
    }

    // Check if we need to create point features from coordinate columns
    if (geojson.features[0].geometry && geojson.features[0].geometry.type === 'Point') {
        // No need for conversion, points are already correctly formatted
    } else if (geojson.features[0].geometry === null) {
        let latField = 'Lat', lonField = 'Long';
        if (geojson.features[0].properties.hasOwnProperty('Y') && 
            geojson.features[0].properties.hasOwnProperty('X')) {
            latField = 'Y';
            lonField = 'X';
        }

        if (geojson.features[0].properties.hasOwnProperty(latField) && 
            geojson.features[0].properties.hasOwnProperty(lonField)) {

            geojson.features.forEach(feature => {
                const lat = parseFloat(feature.properties[latField]);
                const lon = parseFloat(feature.properties[lonField]);

                // Debugging: Log the coordinates
                console.log(`Lat: ${lat}, Lon: ${lon}`);

                // Validate coordinates
                if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
                    console.error(`Invalid coordinates for feature: ${feature.properties}`);
                    return;
                }

                feature.geometry = {
                    type: "Point",
                    coordinates: [lon, lat]
                };
            });
        } else {
            console.error('Cannot find latitude and longitude fields');
            alert('Error: Cannot find latitude and longitude fields in the data');
            return;
        }
    }

    const values = geojson.features.map(f => f.properties[propertyName]);
    const min = Math.min(...values);
    const max = Math.max(...values);

    // Store min and max values in workspaceData
    workspaceData[currentWorkspace].min = min;
    workspaceData[currentWorkspace].max = max;

    if (workspaceData[currentWorkspace].geoJsonLayer) {
        map.removeLayer(workspaceData[currentWorkspace].geoJsonLayer);
    }

    workspaceData[currentWorkspace].geoJsonLayer = L.geoJSON(geojson, {
        pointToLayer: function(feature, latlng) {
            return L.circleMarker(latlng, {
                radius: 8,
                fillColor: getColor(feature.properties[propertyName], min, max),
                color: "#000",
                weight: 1,
                opacity: 1,
                fillOpacity: dataOpacity
            });
        },
        style: function(feature) {
            const style = {
                fillColor: getColor(feature.properties[propertyName], min, max),
                weight: 2,
                opacity: 1,
                color: 'white',
                fillOpacity: dataOpacity
            };
            feature.properties.originalStyle = {...style};
            return style;
        },
        onEachFeature: function(feature, layer) {
            // Remove the bindPopup call here
            layer.on('click', function() {
                const index = geojson.features.indexOf(feature);
                toggleHighlight(index);
            });
        }
    }).addTo(map);
    
    map.fitBounds(workspaceData[currentWorkspace].geoJsonLayer.getBounds());
    
    // Add or update legend
    if (workspaceData[currentWorkspace].legend) {
        map.removeControl(workspaceData[currentWorkspace].legend);
    }
    workspaceData[currentWorkspace].legend = L.control({position: 'bottomright'});
    workspaceData[currentWorkspace].legend.onAdd = function (map) {
        const div = L.DomUtil.create('div', 'info legend');
        const grades = [min, min + (max-min)/4, min + (max-min)/2, min + 3*(max-min)/4, max];
        div.innerHTML += `<h4>${propertyName}</h4>`;
        for (let i = 0; i < grades.length; i++) {
            div.innerHTML +=
                '<i style="background:' + getColor(grades[i], min, max) + '"></i> ' +
                grades[i].toFixed(2) + (grades[i + 1] ? '&ndash;' + grades[i + 1].toFixed(2) + '<br>' : '+');
        }
        return div;
    };
    workspaceData[currentWorkspace].legend.addTo(map);
}

function highlightHistogramBar(index) {
    const histogramElement = document.getElementById(`histogram${currentWorkspace}`);
    if (histogramElement && histogramElement.data) {
        const selectedProperty = document.getElementById(`histogramPropertySelect${currentWorkspace}`).value;
        const value = workspaceData[currentWorkspace].geojson.features[index].properties[selectedProperty];
        
        Plotly.restyle(histogramElement, {
            'marker.color': (_, data) => {
                return data[0].x.map((x, i) => {
                    const binStart = data[0].xbins.start + i * data[0].xbins.size;
                    const binEnd = binStart + data[0].xbins.size;
                    return (value >= binStart && value < binEnd) ? mapHighlightColor : 'rgba(31, 119, 180, 0.7)';
                });
            }
        });
    }
}

function unhighlightHistogramBar(index) {
    const histogramElement = document.getElementById(`histogram${currentWorkspace}`);
    if (histogramElement && histogramElement.data) {
        Plotly.restyle(histogramElement, {
            'marker.color': 'rgba(31, 119, 180, 0.7)'
        });
    }
}

function hideMapTools() {
    const mapToolsContainer = document.querySelector(`#map${currentWorkspace} .map-tools-container`);
    if (mapToolsContainer) {
        mapToolsContainer.style.display = 'none';
    }
    const settingsIcon = document.querySelector(`#map${currentWorkspace} .settings-icon`);
    if (settingsIcon) {
        settingsIcon.style.display = 'none';
    }
}

// ------------------------------------------------------------------------------------------------------------------------------------

function showMap() {
    console.log("Showing Map");
    if (!workspaceData[currentWorkspace].geojson) {
        alert('Please upload and process a shapefile first.');
        return;
    }

    document.getElementById(`map${currentWorkspace}`).style.display = 'block';
    // Keep histogram visible
    // document.getElementById(`histogram${currentWorkspace}`).style.display = 'none';
    document.getElementById(`tableContainer${currentWorkspace}`).style.display = 'none';
    
    const propertySelectContainer = document.getElementById(`propertySelectContainer${currentWorkspace}`);
    propertySelectContainer.style.display = 'block';
    
    // Show map tools
    const mapToolsContainer = document.querySelector(`#map${currentWorkspace} .map-tools-container`);
    if (mapToolsContainer) {
        mapToolsContainer.style.display = 'flex';
    }

    // Show settings icon
    const settingsIcon = document.querySelector(`#map${currentWorkspace} .settings-icon`);
    if (settingsIcon) {
        settingsIcon.style.display = 'flex';
    }

    // Initialize map if it doesn't exist
    if (!workspaceData[currentWorkspace].map) {
        const mapContainer = document.getElementById(`map${currentWorkspace}`);
        if (mapContainer) {
            workspaceData[currentWorkspace].map = L.map(`map${currentWorkspace}`).setView([0, 0], 2);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(workspaceData[currentWorkspace].map);
        } else {
            console.error(`Map container not found for workspace ${currentWorkspace}`);
            return;
        }
    }

    // Reset telescope icon state
    const telescopeIcon = document.querySelector(`#telescopeIcon${currentWorkspace}`);
    if (telescopeIcon) {
        telescopeIcon.classList.remove('active');
    }
    featurePopupsEnabled = false;

    // Populate property select if it hasn't been done yet
    if (propertySelectContainer.children.length === 0) {
        populatePropertySelect(workspaceData[currentWorkspace].geojson.features[0].properties);
    }

    // Render the map
    renderColorfulMap(workspaceData[currentWorkspace].geojson);

    // Invalidate map size to ensure proper rendering
    setTimeout(() => {
        workspaceData[currentWorkspace].map.invalidateSize();
    }, 100);
}

// ------------------------------------------------------------------------------------------------------------------------------------

function renderTable() {
    console.log("Showing Table");
    resetAllHighlights(); 
    if (!workspaceData[currentWorkspace].geojson) {
        alert('Please upload and process a shapefile first.');
        return;
    }

    const tableContainer = document.getElementById(`tableContainer${currentWorkspace}`);
    const geojson = workspaceData[currentWorkspace].geojson;

    // Create table element
    const table = document.createElement('table');
    table.className = 'table table-striped table-hover';

    // Create table header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const properties = geojson.features[0].properties;
    for (let prop in properties) {
        if (prop !== 'originalStyle') { // Skip originalStyle
            const th = document.createElement('th');
            th.textContent = prop;
            headerRow.appendChild(th);
        }
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Create table body
    const tbody = document.createElement('tbody');
    geojson.features.forEach((feature, index) => {
        const row = document.createElement('tr');
        row.id = `row-${index}`;
        for (let prop in feature.properties) {
            if (prop !== 'originalStyle') { // Skip originalStyle
                const td = document.createElement('td');
                td.textContent = feature.properties[prop];
                row.appendChild(td);
            }
        }
        row.addEventListener('click', function() {
            toggleHighlight(index);
        });
        tbody.appendChild(row);
    });
    table.appendChild(tbody);

    // Clear the container and add the new table
    tableContainer.innerHTML = '';
    tableContainer.appendChild(table);
}

// ------------------------------------------------------------------------------------------------------------------------------------

function showTable() {
    console.log("Showing Table");
    if (!workspaceData[currentWorkspace].geojson) {
        alert('Please upload and process a shapefile first.');
        return;
    }

    const mapElement = document.getElementById(`map${currentWorkspace}`);
    const histogramElement = document.getElementById(`histogram${currentWorkspace}`);
    const tableContainer = document.getElementById(`tableContainer${currentWorkspace}`);
    const propertySelectContainer = document.getElementById(`propertySelectContainer${currentWorkspace}`);

    // Show the table container without hiding the map
    tableContainer.style.display = 'block';

    // Keep the map visible
    mapElement.style.display = 'block';

    // Hide histogram if it's visible
    histogramElement.style.display = 'none';

    // Keep property select visible for the map
    propertySelectContainer.style.display = 'block';

    // Render the table
    renderTable();
}

// ------------------------------------------------------------------------------------------------------------------------------------
function selectHistogramProperty() {
    if (!workspaceData[currentWorkspace].geojson) {
        alert('Please upload and process a shapefile first.');
        return;
    }

    const histogramElement = document.getElementById(`histogram${currentWorkspace}`);
    const histogramControlsContainer = document.getElementById(`histogramControlsContainer${currentWorkspace}`);
    const histogramStatsElement = document.getElementById(`histogramStats${currentWorkspace}`);
    
    if (!histogramElement) {
        console.error(`Histogram element not found for workspace ${currentWorkspace}`);
        return;
    }

    if (!histogramControlsContainer) {
        console.error(`Histogram controls container not found for workspace ${currentWorkspace}`);
        return;
    }

    if (!histogramStatsElement) {
        console.error(`Histogram stats element not found for workspace ${currentWorkspace}`);
        return;
    }

    histogramElement.style.display = 'block';
    histogramControlsContainer.style.display = 'block';
    histogramStatsElement.style.display = 'block';

    // Ensure the select element exists
    let histogramPropertySelect = document.getElementById(`histogramPropertySelect${currentWorkspace}`);
    if (!histogramPropertySelect) {
        console.error(`Histogram property select not found for workspace ${currentWorkspace}`);
        return;
    }

    // Ensure the bins input exists
    let histogramBinsInput = document.getElementById(`histogramBins${currentWorkspace}`);
    if (!histogramBinsInput) {
        console.error(`Histogram bins input not found for workspace ${currentWorkspace}`);
        return;
    }

    // Populate property select if it's empty
    if (histogramPropertySelect.options.length === 0) {
        populateHistogramPropertySelect(workspaceData[currentWorkspace].geojson.features[0].properties);
    }

    // Remove existing event listeners to prevent duplicates
    histogramPropertySelect.removeEventListener('change', renderHistogram);
    histogramBinsInput.removeEventListener('input', renderHistogram);

    // Add new event listeners
    histogramPropertySelect.addEventListener('change', renderHistogram);
    histogramBinsInput.addEventListener('input', renderHistogram);

    // Render the initial histogram
    renderHistogram();

    // Push the table down
    const tableContainer = document.getElementById(`tableContainer${currentWorkspace}`);
    if (tableContainer) {
        tableContainer.style.marginTop = '20px';
    }
}

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

function handleHistogramSelection(eventData) {
    if (!eventData || !eventData.points || eventData.points.length === 0) {
        resetAllHighlights();
        return;
    }

    const selectedIndices = new Set();

    eventData.points.forEach(point => {
        if (point.customdata) {
            const binData = point.customdata;
            const binIndices = binData.indices;

            // Add all indices from this bin to the selected set
            binIndices.forEach(index => selectedIndices.add(index));
        } else {
            console.warn('Customdata not found for histogram bar', point);
        }
    });

    highlightSelectedFeatures(selectedIndices);
    updateHistogramHighlight(selectedIndices);
}

function highlightSelectedFeatures(selectedIndices) {
    // Reset all highlights first
    resetAllHighlights();

    // Highlight selected features on map and table
    selectedIndices.forEach(index => {
        const layer = workspaceData[currentWorkspace].geoJsonLayer.getLayers()[index];
        if (layer) {
            layer.setStyle({
                fillColor: mapHighlightColor,
                fillOpacity: dataOpacity,
                weight: mapHighlightWeight,
                color: mapHighlightColor
            });
            layer.bringToFront();
        }
        highlightTableRow(index);
    });

    // Update workspaceData to reflect new selections
    workspaceData[currentWorkspace].highlightedFeatures = selectedIndices;

    // Update histogram highlight
    updateHistogramHighlight(selectedIndices);
}
// ------------------------------------------------------------------------------------------------------------------------------------
function updateStatisticsDisplay(count, min, max, mean) {
    const statElements = [
        { id: `statCount${currentWorkspace}`, value: count },
        { id: `statMin${currentWorkspace}`, value: min },
        { id: `statMax${currentWorkspace}`, value: max },
        { id: `statMean${currentWorkspace}`, value: mean },
    ];

    statElements.forEach(({ id, value }) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = typeof value === 'number' 
                ? value.toFixed(4).replace(/\.?0+$/, '')
                : value;
        } else {
            console.warn(`Element with id ${id} not found`);
        }
    });
}

function renderHistogram() {
    if (!workspaceData[currentWorkspace].geojson) {
        alert('Please upload and process a shapefile first.');
        return;
    }

    const geojson = workspaceData[currentWorkspace].geojson;
    const histogramPropertySelect = document.getElementById(`histogramPropertySelect${currentWorkspace}`);
    const histogramBinsInput = document.getElementById(`histogramBins${currentWorkspace}`);
    const histogramElement = document.getElementById(`histogram${currentWorkspace}`);
    
    if (!histogramPropertySelect || !histogramBinsInput || !histogramElement) {
        console.error('One or more required histogram elements not found');
        return;
    }

    const selectedProperty = histogramPropertySelect.value;
    let numBins = parseInt(histogramBinsInput.value, 10);

    if (isNaN(numBins) || numBins < 1) {
        alert('Please enter a valid positive number for bins.');
        return;
    }
    
    currentNumericValues = geojson.features.map(f => f.properties[selectedProperty])
        .filter(v => typeof v === 'number' && !isNaN(v));

    if (currentNumericValues.length === 0) {
        alert('No numeric values found for the selected property.');
        return;
    }

    // Calculate statistics
    const count = currentNumericValues.length;
    const min = Math.min(...currentNumericValues);
    const max = Math.max(...currentNumericValues);
    const mean = currentNumericValues.reduce((a, b) => a + b, 0) / count;

    // Update statistics display
    updateStatisticsDisplay(count, min, max, mean);

    // Clear existing content
    histogramElement.innerHTML = '';

    // Set up dimensions
    const margin = {top: 20, right: 20, bottom: 30, left: 40};
    const width = histogramElement.clientWidth - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    // Create SVG
    const svg = d3.select(histogramElement)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Create scales
    const x = d3.scaleLinear()
        .domain([min, max])
        .range([0, width]);

    const histogram = d3.histogram()
        .value(d => d)
        .domain(x.domain())
        .thresholds(() => {
            const step = (max - min) / numBins;
            return d3.range(numBins).map(i => min + i * step);
        });

    const bins = histogram(currentNumericValues);

    const y = d3.scaleLinear()
        .range([height, 0])
        .domain([0, d3.max(bins, d => d.length)]);

    // Draw bars
    const bars = svg.selectAll("rect")
        .data(bins)
        .enter()
        .append("rect")
        .attr("x", d => x(d.x0))
        .attr("width", d => Math.max(0, x(d.x1) - x(d.x0) - 1))
        .attr("y", d => y(d.length))
        .attr("height", d => height - y(d.length))
        .attr("fill", "steelblue")
        .attr("data-bin", (d, i) => i);

    // Add click event listener to bars
    bars.on("click", function(event, d) {
        const clickedBar = d3.select(this);
        const binIndex = clickedBar.attr("data-bin");
        const binData = d;
        
        // Toggle selection for all items in this bin
        binData.forEach(value => {
            const index = currentNumericValues.indexOf(value);
            if (workspaceData[currentWorkspace].highlightedFeatures.has(index)) {
                workspaceData[currentWorkspace].highlightedFeatures.delete(index);
            } else {
                workspaceData[currentWorkspace].highlightedFeatures.add(index);
            }
        });

        // Update highlights
        updateHistogramHighlight(workspaceData[currentWorkspace].highlightedFeatures);
        highlightSelectedFeatures(workspaceData[currentWorkspace].highlightedFeatures);
    });

    // Add X axis
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x));

    // Add Y axis
    svg.append("g")
        .call(d3.axisLeft(y));

    // Add title
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", 0 - (margin.top / 2))
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .text(`Histogram of ${selectedProperty}`);

    // Update the map to reflect the new property
    updateMapProperty(selectedProperty);

    // Initial highlight update
    updateHistogramHighlight(workspaceData[currentWorkspace].highlightedFeatures);
}



function updateMapProperty(property) {
    if (workspaceData[currentWorkspace].geoJsonLayer) {
        const geojson = workspaceData[currentWorkspace].geojson;
        const values = geojson.features.map(f => f.properties[property]);
        const numericValues = values.filter(v => typeof v === 'number' && !isNaN(v));
        const min = Math.min(...numericValues);
        const max = Math.max(...numericValues);

        workspaceData[currentWorkspace].geoJsonLayer.setStyle(feature => ({
            fillColor: getColor(feature.properties[property], min, max),
            weight: 2,
            opacity: 1,
            color: 'white',
            fillOpacity: dataOpacity
        }));

        // Update legend
        updateLegend(property, min, max);
    }
}

function updateLegend(property, min, max) {
    if (workspaceData[currentWorkspace].legend) {
        workspaceData[currentWorkspace].map.removeControl(workspaceData[currentWorkspace].legend);
    }

    workspaceData[currentWorkspace].legend = L.control({position: 'bottomright'});
    workspaceData[currentWorkspace].legend.onAdd = function (map) {
        const div = L.DomUtil.create('div', 'info legend');
        const grades = [min, min + (max-min)/4, min + (max-min)/2, min + 3*(max-min)/4, max];
        div.innerHTML += `<h4>${property}</h4>`;
        for (let i = 0; i < grades.length; i++) {
            div.innerHTML +=
                '<i style="background:' + getColor(grades[i], min, max) + '"></i> ' +
                grades[i].toFixed(2) + (grades[i + 1] ? '&ndash;' + grades[i + 1].toFixed(2) + '<br>' : '+');
        }
        return div;
    };
    workspaceData[currentWorkspace].legend.addTo(workspaceData[currentWorkspace].map);
}

// ------------------------------------------------------------------------------------------------------------------------------------

function showScatterPlot() {
    const geojson = workspaceData[currentWorkspace].geojson;
    if (!geojson) {
        alert('Please import data first.');
        return;
    }

    const properties = geojson.features[0].properties;
    const numericProperties = Object.keys(properties).filter(prop => typeof properties[prop] === 'number');

    if (numericProperties.length < 2) {
        alert('At least two numeric properties are required for a scatter plot.');
        return;
    }

    // Create property selection dropdowns
    const xProperty = prompt('Select X-axis property:', numericProperties.join(', '));
    const yProperty = prompt('Select Y-axis property:', numericProperties.join(', '));

    if (!xProperty || !yProperty) return;

    const data = geojson.features.map(feature => ({
        x: feature.properties[xProperty],
        y: feature.properties[yProperty]
    }));

    const layout = {
        title: `Scatter Plot: ${xProperty} vs ${yProperty}`,
        xaxis: { title: xProperty },
        yaxis: { title: yProperty }
    };

    Plotly.newPlot(`histogram${currentWorkspace}`, [{
        type: 'scatter',
        mode: 'markers',
        x: data.map(d => d.x),
        y: data.map(d => d.y)
    }], layout);

    Plotly.newPlot(`histogram${currentWorkspace}`, [{
        type: 'scatter',
        mode: 'markers',
        x: data.map(d => d.x),
        y: data.map(d => d.y)
    }], layout).then(optimizePlotlyCanvases);
}

// ------------------------------------------------------------------------------------------------------------------------------------

function showCumulativeDistribution() {
    const geojson = workspaceData[currentWorkspace].geojson;
    if (!geojson) {
        alert('Please import data first.');
        return;
    }

    const properties = geojson.features[0].properties;
    const numericProperties = Object.keys(properties).filter(prop => typeof properties[prop] === 'number');

    if (numericProperties.length === 0) {
        alert('No numeric properties found for cumulative distribution plot.');
        return;
    }

    const property = prompt('Select property for cumulative distribution:', numericProperties.join(', '));
    if (!property) return;

    const values = geojson.features.map(feature => feature.properties[property]).sort((a, b) => a - b);
    const cdf = values.map((_, index) => (index + 1) / values.length);

    const layout = {
        title: `Cumulative Distribution: ${property}`,
        xaxis: { title: property },
        yaxis: { title: 'Cumulative Probability' }
    };

    Plotly.newPlot(`histogram${currentWorkspace}`, [{
        x: values,
        y: cdf,
        type: 'scatter',
        mode: 'lines',
        name: 'CDF'
    }], layout);

    Plotly.newPlot(`histogram${currentWorkspace}`, [{
        x: values,
        y: cdf,
        type: 'scatter',
        mode: 'lines',
        name: 'CDF'
    }], layout).then(optimizePlotlyCanvases);
}

// ------------------------------------------------------------------------------------------------------------------------------------

function showHeatmap() {
    const geojson = workspaceData[currentWorkspace].geojson;
    if (!geojson) {
        alert('Please import data first.');
        return;
    }

    const properties = geojson.features[0].properties;
    const numericProperties = Object.keys(properties).filter(prop => typeof properties[prop] === 'number');

    if (numericProperties.length < 2) {
        alert('At least two numeric properties are required for a heatmap.');
        return;
    }

    const data = numericProperties.map(prop => 
        geojson.features.map(feature => feature.properties[prop])
    );

    const layout = {
        title: 'Heatmap of Numeric Properties',
        xaxis: { title: 'Properties' },
        yaxis: { title: 'Features' }
    };

    Plotly.newPlot(`histogram${currentWorkspace}`, [{
        z: data,
        type: 'heatmap',
        x: numericProperties,
        y: geojson.features.map((_, index) => `Feature ${index + 1}`)
    }], layout);

    Plotly.newPlot(`histogram${currentWorkspace}`, [{
        z: data,
        type: 'heatmap',
        x: numericProperties,
        y: geojson.features.map((_, index) => `Feature ${index + 1}`)
    }], layout).then(optimizePlotlyCanvases);
}

// ------------------------------------------------------------------------------------------------------------------------------------

function showBoxPlot() {
    const geojson = workspaceData[currentWorkspace].geojson;
    if (!geojson) {
        alert('Please import data first.');
        return;
    }

    const properties = geojson.features[0].properties;
    const numericProperties = Object.keys(properties).filter(prop => typeof properties[prop] === 'number');

    if (numericProperties.length === 0) {
        alert('No numeric properties found for box plot.');
        return;
    }

    const data = numericProperties.map(prop => ({
        y: geojson.features.map(feature => feature.properties[prop]),
        type: 'box',
        name: prop
    }));

    const layout = {
        title: 'Box Plot of Numeric Properties',
        yaxis: { title: 'Values' }
    };

    Plotly.newPlot(`histogram${currentWorkspace}`, data, layout).then(optimizePlotlyCanvases);
}

// ------------------------------------------------------------------------------------------------------------------------------------

function show3DScatter() {
    const geojson = workspaceData[currentWorkspace].geojson;
    if (!geojson) {
        alert('Please import data first.');
        return;
    }

    const properties = geojson.features[0].properties;
    const numericProperties = Object.keys(properties).filter(prop => typeof properties[prop] === 'number');

    if (numericProperties.length < 3) {
        alert('At least three numeric properties are required for a 3D scatter plot.');
        return;
    }

    const xProperty = prompt('Select X-axis property:', numericProperties.join(', '));
    const yProperty = prompt('Select Y-axis property:', numericProperties.join(', '));
    const zProperty = prompt('Select Z-axis property:', numericProperties.join(', '));

    if (!xProperty || !yProperty || !zProperty) return;

    const data = [{
        x: geojson.features.map(feature => feature.properties[xProperty]),
        y: geojson.features.map(feature => feature.properties[yProperty]),
        z: geojson.features.map(feature => feature.properties[zProperty]),
        mode: 'markers',
        type: 'scatter3d',
        marker: { size: 5 }
    }];

    const layout = {
        title: '3D Scatter Plot',
        scene: {
            xaxis: { title: xProperty },
            yaxis: { title: yProperty },
            zaxis: { title: zProperty }
        }
    };

    Plotly.newPlot(`histogram${currentWorkspace}`, data, layout).then(optimizePlotlyCanvases);
}

// ------------------------------------------------------------------------------------------------------------------------------------

function optimizePlotlyCanvases() {
    // Select all canvas elements within Plotly containers
    const canvases = document.querySelectorAll('.plotly-graph-div canvas');
    
    // Set willReadFrequently attribute to true for each canvas
    canvases.forEach(canvas => {
        canvas.willReadFrequently = true;
    });
}