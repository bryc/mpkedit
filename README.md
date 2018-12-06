# MPKEdit - Controller Pak Manager

Makes managing N64 Controller Pak files (.MPK) easy, whether from an emulator or a flash cart. MPKEdit is written in JavaScript and works in most modern browsers (Chrome, Firefox, Opera, etc.). Includes native file system support when installed as a Chrome extension (until Google discontinues Chrome Apps).

### [**Try it online**](http://rawgit.com/bryc/mempak/master/index.html)

#### Features

* Open .MPK and .note files by **dragging and dropping** them, or **browsing** for files
* **Save**, **load**, **delete**, and **re-order** notes
* Add comments to notes (UTF-8)
* DexDrive (.n64) import support
* **Game code database** - automatically identifies game name and publisher
* Inspect metadata from the MPK file and other details

## Instructions

To open files, click the **file icon at the top left**, or drag and drop into the window. Save the file by clicking the Save (floppy) icon at the top right. Individual notes can be saved by clicking the save icon at the rightmost of each row. <!--It is also possible to re-order notes by clicking and dragging.-->

In Chrome, it is possible to save the MPK or notes by dragging the save button to a specific destination or folder.
When running as a Chrome App, holding Control when pressing Save MPK (Floppy icon) will force a Save As dialog instead of overwriting the currently-opened file (default behavior). <!-- Holding the Control key while exporting a note will save the raw data without the note header. It cannot be reimported but may be useful for extracting backed up EEPROM saves. -->

![image](https://user-images.githubusercontent.com/1408749/44122120-7ba24680-9ff0-11e8-8997-b84e3a5378a8.png)

The blocky icons are just a way to identify unique save data, useful if you have multiple saves of the same game and need to differentiate between them. It ended up turning into a fun little side project I'm still working on. Even the smallest change will produce a radically different icon. Useful for finding duplicates too. It's disabled by default, but you can enable them if you want to see what your save's icons look like or just think they're pretty. There should be trillions of different icons possible, so each one is unique!
