function HLAEaeTOOL(thisObj) {

  // -------------------Global variables-------------------

	var fileFormats;
	var cineFramerate;

	// Adjustable variables (feel free to change them)
	function updateGlobalVariables() {
		fileFormats = [".mp4", ".mov", ".avi", ".mkv", ".flv", ".wmv", ".wav", ".mp3"]; // File formats that After Effects will try to import
		cineFramerate = 500; // If no videos in folder, apply this framerate to image sequences
	}

	// About
	var name = "HLAE AE TOOL";
	var version = "1.0";

	// Misc
	var alertMessage = [];

	// UI
	function buildUI(thisObj) {

    // -------------------UI-------------------

		var myPanel = (thisObj instanceof Panel) ? thisObj : new Window("palette", name + " " + version, undefined, { resizeable: true });

		res = "group\
    {\
      orientation:'column',  alignment:['fill','center'], alignChildren:['fill','fill'],\
      mainGroup: Group\
      {\
        orientation:'column', alignChildren:['fill','center'],\
        buttonClipsImport: Button{text: 'Import HLAE Clips'},\
				buttonEXRSetup: Button{text: 'Setup EXR Depth'},\
				buttonCameraImport: Button{text: 'Import Camera (.cam)'},\
      }\
      settingsGroup: Group\
      {\
        orientation:'row', alignment:['right','center'],\
        buttonHelp: Button{text: '?', maximumSize:[25,25]},\
      }\
    }";

    // Add UI elements to the panel
    myPanel.grp = myPanel.add(res);
    // Refresh the panel
    myPanel.layout.layout(true);
    // Set minimal panel size
    myPanel.grp.minimumSize = myPanel.grp.size;
    // Add panel resizing function 
    myPanel.layout.resize();
    myPanel.onResizing = myPanel.onResize = function () {
        this.layout.resize();
    }

    // -------------------Buttons-------------------

    myPanel.grp.mainGroup.buttonClipsImport.onClick = function () {
      importHLAEClips();
    }

		myPanel.grp.mainGroup.buttonEXRSetup.onClick = function () {
      setupEXR();
    }

		myPanel.grp.mainGroup.buttonCameraImport.onClick = function () {
      addCameraToLayer();
    }

    myPanel.grp.settingsGroup.buttonHelp.onClick = function () {
      alertCopy(
        'HLAE: https://github.com/advancedfx/advancedfx/wiki/FAQ\n' +
				'\n' +
        'HLAE AE Tool: https://github.com/eirisocherry/hlae-ae-tool\n' +
				'\n' +
				'Camera Time Remapping: https://github.com/eirisocherry/camera-time-remapping'
      );
    }

		return myPanel;
	}

  // -------------------Buttons-------------------

	function importHLAEClips() {

		// -------------------Import clips-------------------

		app.project.save();

		app.beginUndoGroup("Import clips");

		updateGlobalVariables();

		var file = File.openDialog("Choose any clip from a take folder");

		if (file != null && file.exists) {
				var folder = file.parent;
				processFolder(folder);
		}

		app.endUndoGroup();
	}

	function setupEXR() {

		// -------------------Checkers-------------------

		var comp = app.project.activeItem;

		if (!(comp instanceof CompItem)) {
				alert("Open a composition first");
				return;
		}

		var selectedLayers = comp.selectedLayers;
		if (selectedLayers.length !== 1) {
				alert("Select EXR depth sequence");
				return;
		}

		var selectedLayer = selectedLayers[0];

		// -------------------Setup EXR-------------------

		app.project.save();

		app.beginUndoGroup("setupEXR");

		applyEXRpreset(selectedLayer);

		// Remember in out points
		var minInPoint = selectedLayer.inPoint;
		var maxOutPoint = selectedLayer.outPoint;

		// Precomp
		var layersToPrecompose = [selectedLayer.index];
		var preComp = comp.layers.precompose(layersToPrecompose, "6depthEXR", true);

		// Trim precomp
		var preCompLayer = comp.selectedLayers[0];
		preCompLayer.inPoint = minInPoint;
		preCompLayer.outPoint = maxOutPoint;

    app.endUndoGroup();
	}

	function addCameraToLayer() {

		// -------------------Checkers-------------------

		var comp = app.project.activeItem;
		var selectedLayers = app.project.activeItem.selectedLayers;

		if (!(comp instanceof CompItem)) {
			alert("Open a composition first");
			return;
		}

		if (selectedLayers.length !== 1) {
			alert("Select a single source video");
			return;
		}

		if (selectedLayers[0].source == undefined || selectedLayers[0].source.frameRate == 0 || selectedLayers[0].source.duration == 0) {
			alert("Selected layer isn't a video, please select a source video");
			return;
		}

		var selectedLayer = selectedLayers[0];

		// -------------------Import camera-------------------

		app.project.save();

		app.beginUndoGroup("Add Camera");

		// Read camera file
		var cameraFile = File.openDialog();
		if (!cameraFile || !cameraFile.open("r")) {
			alert("Failed to open file");
			return;
		}

		// Check the file extension
		var fileExtension = cameraFile.name.split('.').pop();
		if (fileExtension.toLowerCase() !== "cam") {
			alert(
				"Incorrect file extension: ." + fileExtension + "\n" + 
				"Please, select a .cam file"
			);
			return;
		}

		// Parse the file
		var fileLines = [];
		while(!cameraFile.eof){
			var line = cameraFile.readln();
			var split = line.split(" ");
			var value = [];
			value.push(parseFloat(split[0]));
			value.push(parseFloat(split[1]));
			value.push(parseFloat(split[2]));
			value.push(parseFloat(split[3]));
			value.push(parseFloat(split[4]));
			value.push(parseFloat(split[5]));
			value.push(parseFloat(split[6]));
			value.push(parseFloat(split[7]));
			value.push(parseFloat(split[8]));
			fileLines.push(value);
		}

		// Check version
		if (fileLines[1][1] !== 2) {
			var continueScript = confirm(
				"Version mismatch: version " + fileLines[1][1] + "\n" +
				"This script is designed for version 2 only\n" +
				"\n" +
				"Do you want to continue anyway?"
			);

			if (!continueScript) {
				return;
			}
		};

		cameraFile.close();

		// -------------------Frames checker-------------------

		var frames = fileLines.length;
		var frameRate = selectedLayer.source.frameRate;
		var duration = selectedLayer.source.duration;
		var expectedFrames = Math.round(duration * frameRate);

		// Check for frame mismatch
		if (Math.abs(frames - expectedFrames - 4) > 1) {
			var continueScript = confirm(
				"Frame mismatch.\n" +
				"\n" +
				"File frames: " + frames + "\n" +
				"Composition frames: " + expectedFrames + " (Duration: " + duration.toFixed(2) + "s, Frame rate: " + frameRate + "fps)\n" +
				"\n" +
				"Possible solutions:\n"+
				"- Make sure composition fps = source fps\n" +
				"- Select a correct source layer\n" +
				"- Open correct camera data file for your cinematic\n" +
				"\n" +
				"Do you want to continue anyway?"
			);

			if (!continueScript) {
				return;
			}
		}

		// Check for time remapping
		if (selectedLayer.timeRemapEnabled) {
			var continueScript = confirm(
				"Error: Seems like you've selected the correct camera data, but because time remapping is applied to the selected layer, your camera data won't match the video.\n" +
				"\n" +
				"Please, remove time remapping from the selected layer\n" +
				"\n"+
				"If you have camera time remapping script, ignore the warning and press YES\n" +
				"\n" +
				"Ignore the warning?"
			);

			if (!continueScript) {
				return;
			}
		}
		
		// -------------------Camera-------------------

		var camera = createCamera(selectedLayer);
		var positions = [];
		var xRotations = [];
		var yRotations = [];
		var zRotations = [];
		var zooms = [];
		var times = [];

		/*
		
		# HLAE to AE axes conversion
		Note: Axes describe both positions and rotations

		HLAE -> AE
		X   ->  Z
		Y   -> -X
		Z   -> -Y
		
		HLAE -> AE (Sorted by AE ZYX Euler)
		Z   -> -Y
		Y   -> -X
		X   ->  Z
		AE rotations apply order = YXZ (y orientation -> x rotation -> z rotation)

		AE  -> HLAE
		X   -> -Y
		Y   -> -Z
		Z   ->  X
		AE rotations = HLAE[-Y, -Z, X];
		
		*/

		// Extract information from selected file
		var skipLines = 4;
		for (var i = skipLines; i < frames; i++) {
			var frameIndex = selectedLayer.startTime * frameRate + i - skipLines;
			var time = frameIndex / frameRate;

			var X = fileLines[i][1];
			var Y = fileLines[i][2];
			var Z = fileLines[i][3];

			var xR = fileLines[i][4];
			var yR = fileLines[i][5];
			var zR = fileLines[i][6];

			var hFOV = fileLines[i][7];
			var zoom = (comp.width/2.0) / Math.tan((hFOV * Math.PI / 180.0)/2.0);

			times.push(time);
			positions.push([-Y, -Z, X]);
			xRotations.push(-yR);
			yRotations.push([0, -zR, 0]);
			zRotations.push(xR);
			zooms.push(zoom);
		}

		camera.position.setValuesAtTimes(times, positions);
		camera.orientation.setValuesAtTimes(times, yRotations);
		camera.rotationX.setValuesAtTimes(times, xRotations);
		camera.rotationZ.setValuesAtTimes(times, zRotations);
		camera.zoom.setValuesAtTimes(times, zooms);

		// -------------------Center null-------------------
		/*
		// Calculate the average position
		var avgPos = [0.0, 0.0, 0.0];
		for (var k = 0; k < positions.length; k++) {
			avgPos[0] += positions[k][0];
			avgPos[1] += positions[k][1];
			avgPos[2] += positions[k][2];
		}
		avgPos[0] /= positions.length;
		avgPos[1] /= positions.length;
		avgPos[2] /= positions.length;

		// Get unique name
		var centerNullName = "Center: " + selectedLayer.name;
		if (comp.layers.byName(centerNullName)) {
			var index = 1;
			while (comp.layers.byName(centerNullName + " (" + index + ")")) {
				index++;
			}

			centerNullName += " (" + index + ")";
		}

		// Create a null at the center of the camera path
		var centerNull = comp.layers.addNull();
		centerNull.name = centerNullName;
		centerNull.source.name = centerNullName;
		centerNull.threeDLayer = true;
		centerNull.startTime = selectedLayer.startTime;
		centerNull.inPoint = selectedLayer.inPoint;
		centerNull.outPoint = selectedLayer.outPoint;
		centerNull.position.setValue(avgPos);

		*/

		// -------------------End-------------------

		setHoldInterpolation(camera);
		moveLayerToBottom(camera);

		app.endUndoGroup();
	}

	// -------------------Functions-------------------

	// Clips Import
	function getExtension(filename) {
		var match = filename.match(/\.([^.]+)$/);
		return match ? "." + match[1] : "";
	}

	function findProjectItemByName(itemName) {
    for (var i = 1; i <= app.project.items.length; i++) {
			var item = app.project.items[i];
			if (item.name === itemName) {
				return item;
			}
    }
    return null;
	}

	function isInArray(array, value) {
		for (var i = 0; i < array.length; i++) {
			if (array[i] === value) return true;
		}
		return false;
	}

	function clearProjectSelection() {
		var sel = app.project.selection;
		for (var i = 0; i < sel.length; i++) {
			sel[i].selected = false;
		}
	}

	function processFolder(folder) {
		// Create folders in project
		var hlaeClipsFolder = findProjectItemByName("HLAE Clips");
		if (hlaeClipsFolder === null) {
			hlaeClipsFolder = app.project.items.addFolder("HLAE Clips");
		}

		var cineFolder = findProjectItemByName(folder.name);
		if (cineFolder === null) {
			var cineFolder = app.project.items.addFolder(folder.name);
		} else {
			var confirmDialog = "Folder \"" + folder.name + "\" already exist\n\nWant to DELETE it and import new clips?";
			if (confirm(confirmDialog)) {
					cineFolder.remove();
					cineFolder = app.project.items.addFolder(folder.name);
			} else {
					return;
			}
		}
		cineFolder.parentFolder = hlaeClipsFolder;

		// Import files
		var items = folder.getFiles();
		for (var i = 0; i < items.length; i++) {
			var item = items[i];

			if (item instanceof File) {
				// Get extension
				var extension = getExtension(item.name).toLowerCase();
				var isVideoFormat = false;

				// Check if supported extension
				for (var j = 0; j < fileFormats.length; j++) {
						if (fileFormats[j] === extension) {
								isVideoFormat = true;
								break;
						}
				}

				if (
						!/^\./.test(item.name) && // Skip hidden files
						isVideoFormat
				) {
						var options = new ImportOptions();
						options.file = item;
						options.importAs = ImportAsType.FOOTAGE;

						try {
								// Import file
								var footageItem = app.project.importFile(options);
								
								// Move to the project folder
								footageItem.parentFolder = cineFolder;

								// Prevent fps limit
								if (footageItem.frameRate > 999) {
									footageItem.mainSource.conformFrameRate = 500;
									footageItem.mainSource.proxyFrameRate = 500;
								}

								// Take framerate from main clip
								if (footageItem.hasVideo) {
									cineFramerate = footageItem.frameRate;
								}
						} catch (e) {
								alert("Import error: " + item.fullName + "\n" + e.message);
						}
				}
			} else if (item instanceof Folder) {
				// Is folder a sequence?
				var files = item.getFiles();
				var sequenceFile = null;
				var searcher = new RegExp("\\d{4,}"); // Find files with 4+ digits in their name
				
				for (var j = 0; j < files.length; j++) {
					if (files[j] instanceof File && searcher.test(files[j].name)) {
						sequenceFile = files[j];
						break;
					}
				}

				if (sequenceFile) {
						var options = new ImportOptions();
						options.file = sequenceFile;
						options.importAs = ImportAsType.FOOTAGE;
						options.sequence = true;
		
						try {
							// Import file
							var footageItem = app.project.importFile(options);

							// Change framerate
							footageItem.name = item.name;
							footageItem.mainSource.conformFrameRate = cineFramerate;
							footageItem.mainSource.proxyFrameRate = cineFramerate;

							// Move to the project folder
							footageItem.parentFolder = cineFolder;
						} catch (e) {
								alert("Import error: " + item.fullName + "\n" + e.message);
						}
				}
			}
		}

		// Precomp folder
		var precomp = precompFolder(cineFolder);
		precomp.parentFolder = cineFolder;

		// Select cinematic folder only
		clearProjectSelection();
		cineFolder.selected = true;
	}

	function precompFolder(folderItem) {
		if (!(folderItem instanceof FolderItem)) {
			alert("Selected file is a not a folder");
			return null;
		}

		// Get first footage
		var firstFootage = null;
		for (var i = 1; i <= folderItem.numItems; i++) {
			var item = folderItem.item(i);
			if (item instanceof FootageItem) {
				firstFootage = item;
				break;
			}
		}

		// Comp settings
		var width = 1920;
		var height = 1080;
		var duration = 10;
		var frameRate = 30;

		if (firstFootage) {
			width = firstFootage.width;
			height = firstFootage.height;
			duration = firstFootage.duration;
			frameRate = firstFootage.frameRate;
		}

		// Create comp
		var newComp = app.project.items.addComp(
			folderItem.name,
			width,
			height,
			1, // Pixel ratio (1:1)
			duration,
			frameRate
		);

		// Add folder items to the comp
		for (var i = folderItem.numItems; i >= 1; i--) {
			var item = folderItem.item(i);
			if (item instanceof FootageItem || item instanceof CompItem) {
				var layer = newComp.layers.add(item);
				// Hide everything but first layer
				if (newComp.numLayers !== folderItem.numItems) {
					layer.enabled = false;
				}
			}
		}

		return newComp;
	}

	// Setup EXR depth
	function applyEXRpreset(selectedLayer) {
		// Check if preset exists
		var appFolderPath = Folder.appPackage.parent.fsName; // Path to AE folder 
		var ffxFile = new File(appFolderPath + "/Support Files/Scripts/ScriptUI Panels/HLAE_AE_TOOL/exrDepth25000.ffx");
		if (!ffxFile.exists) {
				alert("exrDepth25000.ffx not found\nPlease ensure the script is installed correctly");
		}

		// Apply preset
		selectedLayer.applyPreset(ffxFile);
	}

	// Camera Import
	function createCamera(selectedLayer) {
		var camName = "HLAE_CAM: " + selectedLayer.name;
		var existingCam = app.project.activeItem.layers.byName(camName);

		// If the camera already exists, add an index to create a new unique camera
		if (existingCam) {
			var index = 1;
			// Increase index until a unique camera name is found
			while (app.project.activeItem.layers.byName(camName + " (" + index + ")")) {
				index++;
			}
			camName += " (" + index + ")";
		}

		// Create a new camera layer
		var outCam = app.project.activeItem.layers.addCamera("tmp", [app.project.activeItem.width / 2, app.project.activeItem.height / 2]);
		outCam.autoOrient = AutoOrientType.NO_AUTO_ORIENT;
		outCam.name = camName;
		outCam.startTime = selectedLayer.startTime;
		outCam.inPoint = selectedLayer.inPoint;
		outCam.outPoint = selectedLayer.outPoint;
		return outCam;
	}

	function setHoldInterpolationForProperty(prop) {
		if (prop.isTimeVarying) {
				for (var j = 1; j <= prop.numKeys; j++) {
						prop.setInterpolationTypeAtKey(j, KeyframeInterpolationType.HOLD, KeyframeInterpolationType.HOLD);
				}
		}
	}

	function setHoldInterpolation(group) {
		for (var i = 1; i <= group.numProperties; i++) {
			var prop = group.property(i);
			
			if (prop.propertyType === PropertyType.PROPERTY) {
				setHoldInterpolationForProperty(prop);
			} else if (prop.propertyType === PropertyType.INDEXED_GROUP || prop.propertyType === PropertyType.NAMED_GROUP) {
				setHoldInterpolation(prop);
			}
		}
	}

	function moveLayerToBottom(layer) {
		if (!layer || !layer.containingComp) {
			alert("Layer is invalid");
			return;
		}

		var comp = layer.containingComp;
		layer.moveAfter(comp.layers[comp.numLayers]);
	}

	// Alerts
	function alertPush(message) {
		alertMessage.push(message);
	}

	function alertShow(message) {
			alertMessage.push(message);

			if (alertMessage.length === 0) {
					return;
			}

			var allMessages = alertMessage.join("\n\n")

			var dialog = new Window("dialog", "Debug");
			var textGroup = dialog.add("group");
			textGroup.orientation = "column";
			textGroup.alignment = ["fill", "top"];

			var text = textGroup.add("edittext", undefined, allMessages, { multiline: true, readonly: true });
			text.alignment = ["fill", "fill"];
			text.preferredSize.width = 300;
			text.preferredSize.height = 300;

			var closeButton = textGroup.add("button", undefined, "Close");
			closeButton.onClick = function () {
					dialog.close();
			};

			dialog.show();

			alertMessage = [];

	}

	function alertCopy(message) {

			if (message === undefined || message === "") {
					return;
			}

			var dialog = new Window("dialog", "Information");
			var textGroup = dialog.add("group");
			textGroup.orientation = "column";
			textGroup.alignment = ["fill", "top"];

			var text = textGroup.add("edittext", undefined, message, { multiline: true, readonly: true });
			text.alignment = ["fill", "fill"];
			text.preferredSize.width = 300;
			text.preferredSize.height = 150;

			var closeButton = textGroup.add("button", undefined, "Close");
			closeButton.onClick = function () {
					dialog.close();
			};

			dialog.show();

			alertMessage = [];

	}

	// -------------------Show UI-------------------

	var myScriptPal = buildUI(thisObj);
	if ((myScriptPal != null) && (myScriptPal instanceof Window)) {
			myScriptPal.center();
			myScriptPal.show();
	}
	if (this instanceof Panel)
			myScriptPal.show();
}
HLAEaeTOOL(this);