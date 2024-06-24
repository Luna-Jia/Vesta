document.getElementById("open-btn").onclick = function() {
    document.getElementById("sidebar").classList.add("open");
    document.getElementById("main").classList.add("shifted");
    document.getElementById("open-btn").style.display = 'none';
}

document.getElementById("close-btn").onclick = function() {
    document.getElementById("sidebar").classList.remove("open");
    document.getElementById("main").classList.remove("shifted");
    document.getElementById("open-btn").style.display = 'block';
}
