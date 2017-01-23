#MPKEdit - Controller Pak Manager

Manage N64 Controller Pak files easily, with support for note import/export and delete. It is written in plain JavaScript and works in most modern browsers (Chrome, Firefox, Opera, etc.). Includes **native file system support** when installed as a Chrome extension.

#### Features

* Open MPK and note files by **dragging and dropping** them, or **browsing** for files
* **Export**, **import**<!--, **re-order**--> and **delete** notes
* DexDrive (.n64) support (saves as standard .mpk)
* **Game code database** - automatically identifies game name/publisher

### [**Try it online**](http://rawgit.com/bryc/mempak/master/index.html)

## Instructions

To open files, click the file icon at the top left or drag and drop into the window. Save the file by clicking the Save (floppy) icon at the top right. Individual notes can be saved by clicking the export icon at the right-most of each row. <!--It is also possible to re-order notes by clicking and dragging.-->

Holding the Control key while exporting a note will save the raw data without the note header. It cannot be reimported but may be useful for extracting backed up EEPROM saves. When running as a Chrome App, holding Control when pressing Save MPK (Floppy icon) will force a Save As dialog instead of saving the currently-opened file.

In Chrome, it is possible to save MPK or notes by dragging the save button to a specific destination or folder.

<img src="http://i.imgur.com/XPkbSyR.png">
