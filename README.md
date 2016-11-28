#MPKEdit - Controller Pak Manager

Makes managing N64 Controller Pak files easy, with support for note import/export and deleting. Written in plain Javascript so it works in most modern browsers (IE11+, Firefox, Chrome, Opera + others), including native file system support when installed as a Chrome extension.

#### Features

* Open MPK and note files by **dragging and dropping** them, or **browsing** for files
* **Export**, **import**, **re-order** and **delete** notes
* DexDrive (.n64) support (saves as standard .mpk)
* **Game code database** - automatically identifies game name

[**Try it**](http://rawgit.com/bryc/mempak/master/index.htm)

## Instructions

To open files, click the file icon at the top left or drag and drop into the window. Save the file by clicking the Save (floppy) icon at the top right. Individual notes can be saved by clicking the export icon at the right-most of each row. It is also possible to re-order notes by clicking and dragging. 

Holding the Control key while saving will save the raw data without the note header. It cannot be imported but may be useful for extracting backed up EEPROM saves.

In Chrome, it is possible to save MPK or notes by dragging the save button to a specific destination or folder. When ran as a Chrome web app, the save button will normally overwrite the currently opened file, however this can be overridden by holding the Control key which will prompt the user to choose a location and file name.

<img src="http://i.imgur.com/XPkbSyR.png">
