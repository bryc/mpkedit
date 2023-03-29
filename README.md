# MPKEdit - Controller Pak Manager

Makes managing N64 Controller Pak files (.MPK) easy, whether from an emulator or a flash cart. MPKEdit is written in JavaScript and works in most modern browsers (Chrome, Firefox, Opera, etc.).

### [**Try it online**](https://bryc.github.io/mempak)

#### Features

* Open .MPK and .note files by **dragging and dropping** them, or **browsing** for files
* **Save**, **load**, **delete**, and **re-order** individual save files (aka "notes")
* Add comments to your save files
* DexDrive (.n64) import support
* **Game code database** - automatically identifies game name and publisher
* Inspect metadata from the MPK file and other details

## Instructions

To open files, click the **file icon at the top left**, or drag and drop into the window. Save the file by clicking the Save (floppy) icon at the top right. Individual save files (notes) can be saved by clicking the save icon at the rightmost of each row. It is also possible to re-order notes by clicking and dragging with **reorder mode** enabled in Settings.

You can also add text comments to any of the 16 save slots, accessible by clicking the info button beside the save icon. When a note has a comment assigned, a text bubble appears for that entry, which displays the comment when hovered. These will be saved in both .note or .MPK files. Be careful when using .MPKs with comments in an emulator as they may not know how to handle the appended data and it may be lost. Always keep it backed up somewhere.

![image](https://user-images.githubusercontent.com/1408749/44122120-7ba24680-9ff0-11e8-8997-b84e3a5378a8.png)

## Basic Mupen64Plus-Next Save Support

The main N64 emulator in RetroArch is Mupen64Plus-Next, and it bundles all possible save data into one large 290 KB .SRM file per game. MPKEdit has basic support for loading and saving these files, but there are a few limitations. Only the data of Port 1's Controller Pak is loaded. If a game uses EEPROM/SRAM as well, those will not be kept when saving. Controller ports 2, 3 and 4 are ignored. Believe it or not, some games (BattleTanx) let you save to any port, even if you're using port 1, so try not to do that. But for the most part, most games don't use both Controller Pak _and_ internal saves, so it should be fine. This might be improved in the future, but likely would require significant code changes, which aren't worth it just for this.

## Advanced

For advanced users, holding the Control key while saving a note activates **raw note saving** (when activated, save icons turn **red**). This saves _only_ the raw save data itself without any headers. This is intended for situations where the header can be ignored. It is possible to reimport the modified .rawnote file by loading it back into the original .MPK file that it came from. You can also add description text to the **end** of the filename, Just don't change the initial "raw-XXX_XX" part at the beginning of the filename, as that is how it knows where to put it back. The modified .rawnote data **MUST be the same size as the original**, as you cannot alter the size of the note data this way.

Mempaks are sometimes used with utilities like GameShark to back up cartridge saves (.EEP files), so the .rawnote files will work in emulators once renamed properly. Currently, GameShark features are **not officially supported**, it's just a handy tip. BOBdotEXE made a nice tutorial covering more advanced GameShark usage here, but a hex editor will be required: https://www.youtube.com/watch?v=PpolokImIeU.

In Chrome, it is possible to save the MPK or notes to a specific folder by clicking and dragging the save button to your destination or folder. This may not work in all environments.

As for the blocky icons, those are just a way to identify unique save data, useful if you have multiple saves of the same game and need to differentiate between them. It is disabled by default but can be enabled in the Options menu. It ended up turning into a fun little side project I'm still working on. Even the smallest change will produce a radically different icon. Useful for finding duplicates too. It's disabled by default, but you can enable them if you want to see what your save's icons look like or just think they're pretty. There should be trillions of different icons possible, so each one is unique!

