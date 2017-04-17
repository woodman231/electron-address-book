'use strict';
const electron = require('electron');
const {ipcMain} = require('electron');
const {dialog} = require('electron');
const fs = require('fs');
var ab_file_name = "";

const app = electron.app;

// adds debug features like hotkeys for triggering dev tools and reload
require('electron-debug')();

// prevent window being garbage collected
let mainWindow;

function onClosed() {
	// dereference the window
	// for multiple windows store them in an array
	mainWindow = null;
}

function createMainWindow() {
	const win = new electron.BrowserWindow({
		width: 1024,
		height: 768
	});

	win.loadURL(`file://${__dirname}/index.html`);
	win.on('closed', onClosed);

	return win;
}

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit();
	}
});

app.on('activate', () => {
	if (!mainWindow) {
		mainWindow = createMainWindow();
	}
});

app.on('ready', () => {
	mainWindow = createMainWindow();
});

ipcMain.on("page-initialized", (event, arg) => {
	console.log( "page-initialized" );
});

ipcMain.on("get-new-file-from-user", (event, arg) => {	
	dialog.showSaveDialog( mainWindow, 
		{
			title: "Create new Address Book",
			defaultPath: app.getPath( "documents" ),
			filters: [
				{
					name: "Address Books", 
					extensions:['ab']
				}
			]
		}, 
		function(filename) {
			if( typeof filename === "undefined" ) {
				console.log( "no file selected" );
			} else {
				ab_file_name = filename;

				fs.writeFile( ab_file_name, "{ \"contact_index\":0, \"people\":[]}", function(err) {
					console.log( ab_file_name );
					event.sender.send( "ab-file-selected", ab_file_name );
				} );				
			}
		} 
	);
});

ipcMain.on("get-existing-file-from-user", (event, arg) => {
	dialog.showOpenDialog( mainWindow,
		{
			title:"Select an Address Book",
			defaultPath: app.getPath("documents"),
			filters: [
				{
					name: "Address Books", 
					extensions:['ab']
				}
			]
		},
		function(filename) {
			if( typeof filename === "undefined" ) {
				console.log( "no file selected" );
			} else {
				ab_file_name = filename[0];
				event.sender.send( "ab-file-selected", ab_file_name );
			}
		}
	)	
});

ipcMain.on( "get-file-details", (event, arg) => {	
	fs.readFile( arg, "utf8", (err, data) => {
		var content = JSON.parse( data );
		var people = content.people;
		people.forEach( function(person) {
			event.sender.send( "add-person", person );
		} );
	} );
} );

ipcMain.on("get-person-details-for-person-editor-dialog", (event, arg) => {

	console.log( ab_file_name );

	fs.readFile( ab_file_name, "utf8", (err, data) => {
		var content = JSON.parse(data);
		var people = content.people;

		for( var p=0; p<people.length;p++ ) {
			if( people[p].id == arg ) {
				event.sender.send( "person-details-for-person-editor", people[p] );
				break;
			}
		}

	} )

});

ipcMain.on("update-person", (event, arg) => {
	fs.readFile( ab_file_name, "utf8", (err, data) => {
		var content = JSON.parse(data);
		var people = content.people;

		if( arg["id"] == 0 ) {

			content.contact_index = content.contact_index + 1;

			people.push( {
				"id": content.contact_index,
				"LastName": arg["LastName"],
				"FirstName": arg["FirstName"]
				} );

		} else {		

			for( var p=0; p<people.length;p++ ) {
				if( people[p].id == arg["id"] ) {
					people[p].LastName = arg["LastName"];
					people[p].FirstName = arg["FirstName"];				
					break;
				}
			}

		}

		fs.writeFile( ab_file_name, JSON.stringify( content ), (err) => {
			event.sender.send( "ab-file-selected", ab_file_name );
		} )
	} )
})