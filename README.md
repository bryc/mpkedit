# MPKEdit - Controller Pak Manager

Makes managing N64 Controller Pak files (.MPK) easy, whether from an emulator or a flash cart. MPKEdit is written in JavaScript and works in most modern browsers (Chrome, Firefox, Opera, etc.).

### [**Try it online**](https://bryc.github.io/mempak)

#### Features

* Open .MPK and .note files by **dragging and dropping** them, or **browsing** for files
* **Save**, **load**, **delete**, and **re-order** notes
* Add comments to notes
* DexDrive (.n64) import support
* **Game code database** - automatically identifies game name and publisher
* Inspect metadata from the MPK file and other details

## Instructions

To open files, click the **file icon at the top left**, or drag and drop into the window. Save the file by clicking the Save (floppy) icon at the top right. Individual notes can be saved by clicking the save icon at the rightmost of each row. <!--It is also possible to re-order notes by clicking and dragging.-->

You can also add text comments to any of the 16 save slots, accessible by clicking the info button beside the save icon. When a note has a comment assigned, a text bubble appears for that entry, which displays the comment when hovered. These will be saved in both .note or .MPK files. Be careful when using .MPKs with comments in an emulator as they may not know how to handle the appended data and it may be lost. Always keep it backed up somewhere.

![image](https://user-images.githubusercontent.com/1408749/44122120-7ba24680-9ff0-11e8-8997-b84e3a5378a8.png)

For advanced users, holding the Control key while saving a note activates **raw note saving** (when activated, save icons turn **red**). This saves only the raw save data itself without any headers. This is useful for extracting EEPROM or SRAM saves, or for hacking save data. You can reimport the .rawnote file by loading it back into the original .MPK it came from. Just don't change the "raw-XXX_XX" part of the filename, as that is how it knows where to put it back.

In Chrome, it is possible to save the MPK or notes to a specific folder by clicking and dragging the save button to your destination or folder.

As for the blocky icons, those are just a way to identify unique save data, useful if you have multiple saves of the same game and need to differentiate between them. It is disabled by default but can be enabled in the Options menu. It ended up turning into a fun little side project I'm still working on. Even the smallest change will produce a radically different icon. Useful for finding duplicates too. It's disabled by default, but you can enable them if you want to see what your save's icons look like or just think they're pretty. There should be trillions of different icons possible, so each one is unique!

