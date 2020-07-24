// ********************* //
// Constants & Variables //
// ********************* //

// The reference to the firebase database.
var ref = firebase.database().ref('qr-codes');

// The cameras avalible on the device. This is populated upon the user granting permissoin.
var cameras = [];

// The index in the above list of the camera currently being used.
var activeCameraIndex = 0;

// The object responsible for reading the QR Codes.
const html5QrCode = new Html5Qrcode("live-camera-feed", verbose = true);

// A list containing all the scanned messages. This list will not include duplicates.
var scannedMessages = [];

// A list containing the subset of scanned messages that were found on fiewbase.
var scannedMessageExist = [];

// A dictionary containing how many times that code was scanned.
var scannedMessageCountDict = {};

// The 'Scanning' label and the 'switch camera' button are hidden until permissions are given.
$(document).ready(function() {
    $("#status-text").hide()
    $("#switch-camera-button").hide()
});

// Called if the permissions request failed for any reason.
function makeCameraAccessBannerError() {
    document.getElementById("camera-access-banner-title").innerHTML = "Camera Access Error";
    document.getElementById("camera-access-banner-text").innerHTML = "Either access was denied or you are on an insecure connection.";
    document.getElementById("camera-access-banner-button").innerHTML = "Try Again";
};

// When permissions are given we show the 'scanning' label and the 'switch camera' button.
function showCameraControls() {
    document.getElementById("status-text").style.display = "block"
    document.getElementById("switch-camera-button").style.display = "block"
};

// When permission are given we hide the permission request elements.
function hideCameraAccessBanner() {
    document.getElementById("camera-access-banner-title").style.display = "none"
    document.getElementById("camera-access-banner-text").style.display = "none"
    document.getElementById("camera-access-banner-button").style.display = "none"
};

// Called when the user switches the camera. The current camera is becomes the next one in the array until it loops around.
function switchCamera() {
    activeCameraIndex++;
    if (activeCameraIndex >= cameras.length) {
        activeCameraIndex = 0;
    };
    stopScanning();
    html5QrCode.clear();
    startScanning(cameras[activeCameraIndex].id);
}

// Called when a QR Code is scanned. When this is called 'scannedMessages', 'scannedMessageExist', and 'scannedMessageCountDict' all contain the latest scan.
function qrMessageScanned() {

    // Clear the list of scanned codes. It will be repopulated.
    document.getElementById("qr-message-list").innerHTML = ''

    // For each scanned message that should appear in the list...
    for(i = 0; i < scannedMessages.length; i++) {

        // Extract how many times it was scanned.
        var timesScanned = scannedMessageCountDict[scannedMessages];

        // Extract the message of the QR Code.
        var message = scannedMessages[i]

        // Create a list item for it.
        var listItem = document.createElement("li");
        listItem.setAttribute('class',"list-group-item d-flex justify-content-between align-items-center");
        listItem.appendChild(document.createTextNode(message));

        // Add a badge showing if it has been found or not.
        var badge = document.createElement("span");
        badge.setAttribute('id',"message");

        if (scannedMessageExist.includes(message)) {
            badge.setAttribute('class',"badge badge-primary badge-pill");
            badge.innerHTML = "Found";
        } else {
            badge.setAttribute('class',"badge badge-danger badge-pill");
            badge.innerHTML = "Not Found";
        };

        listItem.appendChild(badge);

        // Add the list item to the list.
        document.getElementById("qr-message-list").appendChild(listItem);
    };

};

// Called when the user requests camera access.
// Populates the device list.
function requestCameraAccess() {

    // This method will trigger user permissions
    Html5Qrcode.getCameras().then(devices => {
        // devices would be an array of objects of type:
        // {} id: "id", label: "label" }
        if (devices && devices.length) {
            cameras = devices;
            var cameraId = devices[0].id;
            startScanning(cameraId);
            hideCameraAccessBanner();
            showCameraControls();
        }
    }).catch(err => {
        makeCameraAccessBannerError();
    });
};

// Called after the user gives permission. Starts looking at the camera feed for QR Codes.
function startScanning(cameraId) {

    // Start looking.
    html5QrCode.start(
        cameraId, {
            fps: 1, // The amount of times it scans for codes per second.
        },
        qrCodeMessage => { // Called when a code is scanned.

            // Increment the scan count.
            if (qrCodeMessage in scannedMessageCountDict) {
                scannedMessageCountDict[qrCodeMessage]++;
            } else {
                scannedMessageCountDict[qrCodeMessage] = 1;
                scannedMessages.push(qrCodeMessage);
            };

            // Determine if it is in the database.
            ref.child(qrCodeMessage).once("value",snapshot => {
                if (snapshot.exists()){
                    if (!scannedMessageExist.includes(qrCodeMessage)) {
                        scannedMessageExist.push(qrCodeMessage);
                    };
                };
                qrMessageScanned();
            });

        },
        errorMessage => {
            // Called if the current frame is not a qr code.
        })
        .catch(err => {
            alert("Live Feed Failed");
        });
    };

// Called when the user switches cameras.
function stopScanning() {
    html5QrCode.stop().then(ignore => {
        // QR Code scanning is stopped.
    }).catch(err => {
        alert("Stop Failed");
    });
};
