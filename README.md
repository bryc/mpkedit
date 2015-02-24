*<div align=right>(wip) bryc | https://github.com/bryc/mempak | 2015</div>*
##**N64 Controller Pak Binary Format**

The general file structure is simple. The Controller Pak contains 32 KiB of
battery-backed SRAM. The entire file is split into 128 equal segments
(here known as *pages*), each covering 256 bytes for a total of 32,768 bytes.
Games have up to 123 pages of data and 16 header entries (here known as *notes*)
at their disposal. The first 5 pages are reserved for system purposes and
are the only pages with any special meaning.

####**Page 0: Label / serial area (`0x0000 – 0x00FF`)**

This page contains a label area, and a number of checksummed blocks. I believe
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
The second checksum takes the first checksum, and subtracts it from `0xFFF2`.

The offsets for the checksum sections are as follows:

`0x0020`:`0x003F` – Primary copy<br>
`0x0060`:`0x007F` – Backup copy #1<br>
`0x0080`:`0x009F` – Backup copy #2<br>
`0x00C0`:`0x00DF` – Backup copy #3

####**Page 1: Inode table page, primary (`0x0100 – 0x01FF`)**

The Inode table is where data allocations are stored. The indexes of the table map
directly to overall number of pages, and indicate the state of each block:

Code    |  Purpose
--------|------------
`0x01`  | "Last page"
`0x03`  | "Free page"
`0x05` to `0x7F`  | "Next page"

There is an 8-bit checksum stored at `0x01` which is just the sum of bytes `0x0A` to `0xFF` with overflow.

####**Page 2: Inode table, backup (`0x0200 – 0x02FF`)**

This is a 1:1 backup of the primary inode table.

####**Page 3: Note table (`0x0300 – 0x03FF`)**

The note tables (page 3 and 4) store header information for each game save. Each
header is 32 bytes in size. One page can contain 8 notes. 

Offset        | Description
--------------|---------------------
`0x00`:`0x03` | Game ID (ASCII, e.g. "NSME")
`0x04`:`0x05` | Publisher code, (ASCII, e.g. "01")
`0x06`        | Typically set to `0x00`
`0x07`        | Inode start address
`0x08`        | Unknown, typically needs to be set to `0x02`
`0x09`        | Unknown, might be game-specific? `0x03` is common
`0x0A`        | Typically set to `0x00`
`0x0B`        | Typically set to `0x00`
`0x0C`        | Filename extension (N64 encoding)
`0x0D`        | Filename extension, non-standard (N64 encoding)
`0x0E`        | Filename extension, non-standard (N64 encoding)
`0x0F`        | Unknown, 0 / 15 / 38 / 178
`0x10`:`0x1F` | Note name (N64 encoding)

####**Page 4: Note table, continued (`0x0400 – 0x04FF`)**

This page allows for eight additional notes to be saved, for a total of 16.

####**Page 5: First game data page (`0x0500 – 0x05FF`)**

Pages 5 to 127 are reserved for game save data. It is all variable. The data is
accessed through the Inode table, which determines which blocks of data are “free”
or “used” by a game.



