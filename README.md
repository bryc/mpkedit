# HTML5 MemPak reader/editor
Allows you to open N64 Controller Pak files, as well as import DexDrive saves, and export/import notes, delete notes, and save the modified MPK file. Written in plain Javascript and works in Chrome and Firefox.

*<div align=right>(wip) bryc | https://github.com/bryc/mempak | 2015</div>*
#**N64 Controller Pak Binary Format**

The general file structure is simple. The Controller Pak contains 32 KiB (32,768 bytes) of
battery-backed SRAM. The entire file is split into 128 equal segments
(known as *pages*), each covering 256 bytes.
There are 123 pages of data and 16 header entries (known as *notes*) available for saving games. The first 5 pages contain headers and other data crucial to the function of the Controller Pak.

###**Page 0: Label / serial area (`0x0000 – 0x00FF`)**

This page contains a label area, and a number of checksummed blocks. According to N64 developer documents
this section is used to detect when a pak is replaced with a new one. The label
area seems to have no effect on the games, but the checksum-protected area may
have some flag bits holding information on the state of the filesystem.

There are four checksum-protected blocks, each 32 bytes in size. The first
block serves as the primary copy, and the other three are simply backup copies
that are used if the primary ever becomes corrupt.

The checksum algorithm used takes the sum of the first fourteen 16-bit words, and stores them
as two seperate checksums in the remaining 15th and 16th word respectively.
The first checksum (word 15) is the sum of the previous fourteen 16-bit words, and is stored
as a 16-bit integer with overflow (simulated by AND-masking with `0xFFFF`).
The second checksum takes the first checksum (after overflow), and subtracts it from `0xFFF2`.

The offsets for the checksum sections are as follows:

`0x0020`:`0x003F` – Primary copy<br>
`0x0060`:`0x007F` – Backup copy #1<br>
`0x0080`:`0x009F` – Backup copy #2<br>
`0x00C0`:`0x00DF` – Backup copy #3

###**Page 1: Inode table page, primary (`0x0100 – 0x01FF`)**


The Inode table maps all of the pages in the Controller Pak to internal representations for controlling page allocations.
It is one page (256 bytes) split into 128 two-byte chunks, where each chunk maps directly to one of the 128 pages in the overall filesystem. The first 5 chunks have no known purpose, other than chunk `0x00` which holds an 8-bit checksum of chunks `0x05` - `0x7F`.

It is used to define which pages are free and which pages are used by any notes present on the MemPak. The indexes of the table contain values which indicate the state of each page:

Code    |  Purpose
--------|------------
`0x0001`  | "Used, Last page in sequence"
`0x0003`  | "Free page"
`0x0005` to `0x007F`  | "Used, Next page in sequence"

If the value is `0x01` or `0x05-0x7F`, then that page is in use. `0x01` means that it is the last page of a sequence, and any digit from `0x05-0x7F` specify the next page in the sequence. The first page of a sequence is defined in the Note Table.

###**Page 2: Inode table, backup (`0x0200 – 0x02FF`)**

This is a 1:1 backup of the primary Inode table and is restored if the primary is invalid.

###**Page 3 and 4: Note table (`0x0300 – 0x04FF`)**

The Note table (page 3 and 4) stores header information for each game save/note. A total of 16 notes can be saved. Each
entry is 32 bytes in size.

Offset        | Description
--------------|---------------------
`0x00`:`0x03` | Game ID (ASCII, e.g. "NSME")
`0x04`:`0x05` | Publisher code, (ASCII, e.g. "01")
`0x06`        | Part of Inode start address? Must be `0x00`
`0x07`        | Inode start address (First page in sequence)
`0x08`        | Unknown, typically needs to be set to `0x02` to be read by a game
`0x09`        | Unknown, might be game-specific? `0x03` is common
`0x0A`        | Typically set to `0x00`
`0x0B`        | Typically set to `0x00`
`0x0C`        | Filename extension (N64 encoding)
`0x0D`        | Filename extension, non-standard (N64 encoding)
`0x0E`        | Filename extension, non-standard (N64 encoding)
`0x0F`        | Filename extension, non-standard (N64 encoding)?, 0 / 15 / 38 / 178
`0x10`:`0x1F` | Note name (N64 character encoding)

###**Page 5: First game data page (`0x0500 – 0x05FF`)**

Pages 5 to 127 are reserved for game save data. It has no context, it is just raw streams of bytes. The data is
accessed through the Inode table, which determines which blocks of data are “free”
or “used” by a game.
