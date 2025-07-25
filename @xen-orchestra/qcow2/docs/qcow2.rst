=======================
Qcow2 Image File Format
=======================

A ``qcow2`` image file is organized in units of constant size, which are called
(host) clusters. A cluster is the unit in which all allocations are done,
both for actual guest data and for image metadata.

Likewise, the virtual disk as seen by the guest is divided into (guest)
clusters of the same size.

All numbers in qcow2 are stored in Big Endian byte order.

Header
------

The first cluster of a qcow2 image contains the file header::

    Byte  0 -  3:   magic
                    QCOW magic string ("QFI\xfb")

          4 -  7:   version
                    Version number (valid values are 2 and 3)

          8 - 15:   backing_file_offset
                    Offset into the image file at which the backing file name
                    is stored (NB: The string is not null terminated). 0 if the
                    image doesn't have a backing file.

                    Note: backing files are incompatible with raw external data
                    files (auto-clear feature bit 1).

         16 - 19:   backing_file_size
                    Length of the backing file name in bytes. Must not be
                    longer than 1023 bytes. Undefined if the image doesn't have
                    a backing file.

         20 - 23:   cluster_bits
                    Number of bits that are used for addressing an offset
                    within a cluster (1 << cluster_bits is the cluster size).
                    Must not be less than 9 (i.e. 512 byte clusters).

                    Note: QEMU as of today has an implementation limit of 2 MB
                    as the maximum cluster size and won't be able to open images
                    with larger cluster sizes.

                    Note: if the image has Extended L2 Entries then cluster_bits
                    must be at least 14 (i.e. 16384 byte clusters).

         24 - 31:   size
                    Virtual disk size in bytes.

                    Note: QEMU has an implementation limit of 32 MB as
                    the maximum L1 table size.  With a 2 MB cluster
                    size, it is unable to populate a virtual cluster
                    beyond 2 EB (61 bits); with a 512 byte cluster
                    size, it is unable to populate a virtual size
                    larger than 128 GB (37 bits).  Meanwhile, L1/L2
                    table layouts limit an image to no more than 64 PB
                    (56 bits) of populated clusters, and an image may
                    hit other limits first (such as a file system's
                    maximum size).

         32 - 35:   crypt_method
                    0 for no encryption
                    1 for AES encryption
                    2 for LUKS encryption

         36 - 39:   l1_size
                    Number of entries in the active L1 table

         40 - 47:   l1_table_offset
                    Offset into the image file at which the active L1 table
                    starts. Must be aligned to a cluster boundary.

         48 - 55:   refcount_table_offset
                    Offset into the image file at which the refcount table
                    starts. Must be aligned to a cluster boundary.

         56 - 59:   refcount_table_clusters
                    Number of clusters that the refcount table occupies

         60 - 63:   nb_snapshots
                    Number of snapshots contained in the image

         64 - 71:   snapshots_offset
                    Offset into the image file at which the snapshot table
                    starts. Must be aligned to a cluster boundary.

For version 2, the header is exactly 72 bytes in length, and finishes here.
For version 3 or higher, the header length is at least 104 bytes, including
the next fields through ``header_length``.
::

         72 -  79:  incompatible_features
                    Bitmask of incompatible features. An implementation must
                    fail to open an image if an unknown bit is set.

                    Bit 0:      Dirty bit.  If this bit is set then refcounts
                                may be inconsistent, make sure to scan L1/L2
                                tables to repair refcounts before accessing the
                                image.

                    Bit 1:      Corrupt bit.  If this bit is set then any data
                                structure may be corrupt and the image must not
                                be written to (unless for regaining
                                consistency).

                    Bit 2:      External data file bit.  If this bit is set, an
                                external data file is used. Guest clusters are
                                then stored in the external data file. For such
                                images, clusters in the external data file are
                                not refcounted. The offset field in the
                                Standard Cluster Descriptor must match the
                                guest offset and neither compressed clusters
                                nor internal snapshots are supported.

                                An External Data File Name header extension may
                                be present if this bit is set.

                    Bit 3:      Compression type bit.  If this bit is set,
                                a non-default compression is used for compressed
                                clusters. The compression_type field must be
                                present and not zero.

                    Bit 4:      Extended L2 Entries.  If this bit is set then
                                L2 table entries use an extended format that
                                allows subcluster-based allocation. See the
                                Extended L2 Entries section for more details.

                    Bits 5-63:  Reserved (set to 0)

         80 -  87:  compatible_features
                    Bitmask of compatible features. An implementation can
                    safely ignore any unknown bits that are set.

                    Bit 0:      Lazy refcounts bit.  If this bit is set then
                                lazy refcount updates can be used.  This means
                                marking the image file dirty and postponing
                                refcount metadata updates.

                    Bits 1-63:  Reserved (set to 0)

         88 -  95:  autoclear_features
                    Bitmask of auto-clear features. An implementation may only
                    write to an image with unknown auto-clear features if it
                    clears the respective bits from this field first.

                    Bit 0:      Bitmaps extension bit
                                This bit indicates consistency for the bitmaps
                                extension data.

                                It is an error if this bit is set without the
                                bitmaps extension present.

                                If the bitmaps extension is present but this
                                bit is unset, the bitmaps extension data must be
                                considered inconsistent.

                    Bit 1:      Raw external data bit
                                If this bit is set, the external data file can
                                be read as a consistent standalone raw image
                                without looking at the qcow2 metadata.

                                Setting this bit has a performance impact for
                                some operations on the image (e.g. writing
                                zeros requires writing to the data file instead
                                of only setting the zero flag in the L2 table
                                entry) and conflicts with backing files.

                                This bit may only be set if the External Data
                                File bit (incompatible feature bit 1) is also
                                set.

                    Bits 2-63:  Reserved (set to 0)

         96 -  99:  refcount_order
                    Describes the width of a reference count block entry (width
                    in bits: refcount_bits = 1 << refcount_order). For version 2
                    images, the order is always assumed to be 4
                    (i.e. refcount_bits = 16).
                    This value may not exceed 6 (i.e. refcount_bits = 64).

        100 - 103:  header_length
                    Length of the header structure in bytes. For version 2
                    images, the length is always assumed to be 72 bytes.
                    For version 3 it's at least 104 bytes and must be a multiple
                    of 8.


Additional fields (version 3 and higher)
----------------------------------------

In general, these fields are optional and may be safely ignored by the software,
as well as filled by zeros (which is equal to field absence), if software needs
to set field B, but does not care about field A which precedes B. More
formally, additional fields have the following compatibility rules:

1. If the value of the additional field must not be ignored for correct
   handling of the file, it will be accompanied by a corresponding incompatible
   feature bit.

2. If there are no unrecognized incompatible feature bits set, an unknown
   additional field may be safely ignored other than preserving its value when
   rewriting the image header.

.. _ref_rules_3:

3. An explicit value of 0 will have the same behavior as when the field is not
   present*, if not altered by a specific incompatible bit.

(*) A field is considered not present when ``header_length`` is less than or equal
to the field's offset. Also, all additional fields are not present for
version 2.

::

        104:        compression_type

                    Defines the compression method used for compressed clusters.
                    All compressed clusters in an image use the same compression
                    type.

                    If the incompatible bit "Compression type" is set: the field
                    must be present and non-zero (which means non-deflate
                    compression type). Otherwise, this field must not be present
                    or must be zero (which means deflate).

                    Available compression type values:
                       - 0: deflate <https://www.ietf.org/rfc/rfc1951.txt>
                       - 1: zstd <http://github.com/facebook/zstd>

                    The deflate compression type is called "zlib"
                    <https://www.zlib.net/> in QEMU. However, clusters with the
                    deflate compression type do not have zlib headers.

        105 - 111:  Padding, contents defined below.

Header padding
--------------

``header_length`` must be a multiple of 8, which means that if the end of the last
additional field is not aligned, some padding is needed. This padding must be
zeroed, so that if some existing (or future) additional field will fall into
the padding, it will be interpreted accordingly to point `[3.] <#ref_rules_3>`_ of the previous
paragraph, i.e.  in the same manner as when this field is not present.


Header extensions
-----------------

Directly after the image header, optional sections called header extensions can
be stored. Each extension has a structure like the following::

    Byte  0 -  3:   Header extension type:
                        0x00000000 - End of the header extension area
                        0xe2792aca - Backing file format name string
                        0x6803f857 - Feature name table
                        0x23852875 - Bitmaps extension
                        0x0537be77 - Full disk encryption header pointer
                        0x44415441 - External data file name string
                        other      - Unknown header extension, can be safely
                                     ignored

          4 -  7:   Length of the header extension data

          8 -  n:   Header extension data

          n -  m:   Padding to round up the header extension size to the next
                    multiple of 8.

Unless stated otherwise, each header extension type shall appear at most once
in the same image.

If the image has a backing file then the backing file name should be stored in
the remaining space between the end of the header extension area and the end of
the first cluster. It is not allowed to store other data here, so that an
implementation can safely modify the header and add extensions without harming
data of compatible features that it doesn't support. Compatible features that
need space for additional data can use a header extension.


String header extensions
------------------------

Some header extensions (such as the backing file format name and the external
data file name) are just a single string. In this case, the header extension
length is the string length and the string is not ``\0`` terminated. (The header
extension padding can make it look like a string is ``\0`` terminated, but
neither is padding always necessary nor is there a guarantee that zero bytes
are used for padding.)


Feature name table
------------------

The feature name table is an optional header extension that contains the name
for features used by the image. It can be used by applications that don't know
the respective feature (e.g. because the feature was introduced only later) to
display a useful error message.

The number of entries in the feature name table is determined by the length of
the header extension data. Each entry looks like this::

    Byte       0:   Type of feature (select feature bitmap)
                        0: Incompatible feature
                        1: Compatible feature
                        2: Autoclear feature

               1:   Bit number within the selected feature bitmap (valid
                    values: 0-63)

          2 - 47:   Feature name (padded with zeros, but not necessarily null
                    terminated if it has full length)


Bitmaps extension
-----------------

The bitmaps extension is an optional header extension. It provides the ability
to store bitmaps related to a virtual disk. For now, there is only one bitmap
type: the dirty tracking bitmap, which tracks virtual disk changes from some
point in time.

The data of the extension should be considered consistent only if the
corresponding auto-clear feature bit is set, see ``autoclear_features`` above.

The fields of the bitmaps extension are::

    Byte  0 -  3:  nb_bitmaps
                   The number of bitmaps contained in the image. Must be
                   greater than or equal to 1.

                   Note: QEMU currently only supports up to 65535 bitmaps per
                   image.

          4 -  7:  Reserved, must be zero.

          8 - 15:  bitmap_directory_size
                   Size of the bitmap directory in bytes. It is the cumulative
                   size of all (nb_bitmaps) bitmap directory entries.

         16 - 23:  bitmap_directory_offset
                   Offset into the image file at which the bitmap directory
                   starts. Must be aligned to a cluster boundary.

Full disk encryption header pointer
-----------------------------------

The full disk encryption header must be present if, and only if, the
``crypt_method`` header requires metadata. Currently this is only true
of the ``LUKS`` crypt method. The header extension must be absent for
other methods.

This header provides the offset at which the crypt method can store
its additional data, as well as the length of such data.
::

    Byte  0 -  7:   Offset into the image file at which the encryption
                    header starts in bytes. Must be aligned to a cluster
                    boundary.
    Byte  8 - 15:   Length of the written encryption header in bytes.
                    Note actual space allocated in the qcow2 file may
                    be larger than this value, since it will be rounded
                    to the nearest multiple of the cluster size. Any
                    unused bytes in the allocated space will be initialized
                    to 0.

For the LUKS crypt method, the encryption header works as follows.

The first 592 bytes of the header clusters will contain the LUKS
partition header. This is then followed by the key material data areas.
The size of the key material data areas is determined by the number of
stripes in the key slot and key size. Refer to the LUKS format
specification (``docs/on-disk-format.pdf`` in the cryptsetup source
package) for details of the LUKS partition header format.

In the LUKS partition header, the ``payload-offset`` field will be
calculated as normal for the LUKS spec. ie the size of the LUKS
header, plus key material regions, plus padding, relative to the
start of the LUKS header. This offset value is not required to be
qcow2 cluster aligned. Its value is currently never used in the
context of qcow2, since the qcow2 file format itself defines where
the real payload offset is, but none the less a valid payload offset
should always be present.

In the LUKS key slots header, the ``key-material-offset`` is relative
to the start of the LUKS header clusters in the qcow2 container,
not the start of the qcow2 file.

Logically the layout looks like
::

  +-----------------------------+
  | QCow2 header                |
  | QCow2 header extension X    |
  | QCow2 header extension FDE  |
  | QCow2 header extension ...  |
  | QCow2 header extension Z    |
  +-----------------------------+
  | ....other QCow2 tables....  |
  .                             .
  .                             .
  +-----------------------------+
  | +-------------------------+ |
  | | LUKS partition header   | |
  | +-------------------------+ |
  | | LUKS key material 1     | |
  | +-------------------------+ |
  | | LUKS key material 2     | |
  | +-------------------------+ |
  | | LUKS key material ...   | |
  | +-------------------------+ |
  | | LUKS key material 8     | |
  | +-------------------------+ |
  +-----------------------------+
  | QCow2 cluster payload       |
  .                             .
  .                             .
  .                             .
  |                             |
  +-----------------------------+

Data encryption
---------------

When an encryption method is requested in the header, the image payload
data must be encrypted/decrypted on every write/read. The image headers
and metadata are never encrypted.

The algorithms used for encryption vary depending on the method

 - ``AES``:

   The AES cipher, in CBC mode, with 256 bit keys.

   Initialization vectors generated using plain64 method, with
   the virtual disk sector as the input tweak.

   This format is no longer supported in QEMU system emulators, due
   to a number of design flaws affecting its security. It is only
   supported in the command line tools for the sake of back compatibility
   and data liberation.

 - ``LUKS``:

   The algorithms are specified in the LUKS header.

   Initialization vectors generated using the method specified
   in the LUKS header, with the physical disk sector as the
   input tweak.

Host cluster management
-----------------------

qcow2 manages the allocation of host clusters by maintaining a reference count
for each host cluster. A refcount of 0 means that the cluster is free, 1 means
that it is used, and >= 2 means that it is used and any write access must
perform a COW (copy on write) operation.

The refcounts are managed in a two-level table. The first level is called
refcount table and has a variable size (which is stored in the header). The
refcount table can cover multiple clusters, however it needs to be contiguous
in the image file.

It contains pointers to the second level structures which are called refcount
blocks and are exactly one cluster in size.

Although a large enough refcount table can reserve clusters past 64 PB
(56 bits) (assuming the underlying protocol can even be sized that
large), note that some qcow2 metadata such as L1/L2 tables must point
to clusters prior to that point.

.. note::
    QEMU has an implementation limit of 8 MB as the maximum refcount
    table size.  With a 2 MB cluster size and a default refcount_order of
    4, it is unable to reference host resources beyond 2 EB (61 bits); in
    the worst case, with a 512 cluster size and refcount_order of 6, it is
    unable to access beyond 32 GB (35 bits).

Given an offset into the image file, the refcount of its cluster can be
obtained as follows::

    refcount_block_entries = (cluster_size * 8 / refcount_bits)

    refcount_block_index = (offset / cluster_size) % refcount_block_entries
    refcount_table_index = (offset / cluster_size) / refcount_block_entries

    refcount_block = load_cluster(refcount_table[refcount_table_index]);
    return refcount_block[refcount_block_index];

Refcount table entry::

    Bit  0 -  8:    Reserved (set to 0)

         9 - 63:    Bits 9-63 of the offset into the image file at which the
                    refcount block starts. Must be aligned to a cluster
                    boundary.

                    If this is 0, the corresponding refcount block has not yet
                    been allocated. All refcounts managed by this refcount block
                    are 0.

Refcount block entry ``(x = refcount_bits - 1)``::

    Bit  0 -  x:    Reference count of the cluster. If refcount_bits implies a
                    sub-byte width, note that bit 0 means the least significant
                    bit in this context.


Cluster mapping
---------------

Just as for refcounts, qcow2 uses a two-level structure for the mapping of
guest clusters to host clusters. They are called L1 and L2 table.

The L1 table has a variable size (stored in the header) and may use multiple
clusters, however it must be contiguous in the image file. L2 tables are
exactly one cluster in size.

The L1 and L2 tables have implications on the maximum virtual file
size; for a given L1 table size, a larger cluster size is required for
the guest to have access to more space.  Furthermore, a virtual
cluster must currently map to a host offset below 64 PB (56 bits)
(although this limit could be relaxed by putting reserved bits into
use).  Additionally, as cluster size increases, the maximum host
offset for a compressed cluster is reduced (a 2M cluster size requires
compressed clusters to reside below 512 TB (49 bits), and this limit
cannot be relaxed without an incompatible layout change).

Given an offset into the virtual disk, the offset into the image file can be
obtained as follows::

    l2_entries = (cluster_size / sizeof(uint64_t))        [*]

    l2_index = (offset / cluster_size) % l2_entries
    l1_index = (offset / cluster_size) / l2_entries

    l2_table = load_cluster(l1_table[l1_index]);
    cluster_offset = l2_table[l2_index];

    return cluster_offset + (offset % cluster_size)

    [*] this changes if Extended L2 Entries are enabled, see next section

L1 table entry::

    Bit  0 -  8:    Reserved (set to 0)

         9 - 55:    Bits 9-55 of the offset into the image file at which the L2
                    table starts. Must be aligned to a cluster boundary. If the
                    offset is 0, the L2 table and all clusters described by this
                    L2 table are unallocated.

        56 - 62:    Reserved (set to 0)

             63:    0 for an L2 table that is unused or requires COW, 1 if its
                    refcount is exactly one. This information is only accurate
                    in the active L1 table.

L2 table entry::

    Bit  0 -  61:   Cluster descriptor

              62:   0 for standard clusters
                    1 for compressed clusters

              63:   0 for clusters that are unused, compressed or require COW.
                    1 for standard clusters whose refcount is exactly one.
                    This information is only accurate in L2 tables
                    that are reachable from the active L1 table.

                    With external data files, all guest clusters have an
                    implicit refcount of 1 (because of the fixed host = guest
                    mapping for guest cluster offsets), so this bit should be 1
                    for all allocated clusters.

Standard Cluster Descriptor::

    Bit       0:    If set to 1, the cluster reads as all zeros. The host
                    cluster offset can be used to describe a preallocation,
                    but it won't be used for reading data from this cluster,
                    nor is data read from the backing file if the cluster is
                    unallocated.

                    With version 2 or with extended L2 entries (see the next
                    section), this is always 0.

         1 -  8:    Reserved (set to 0)

         9 - 55:    Bits 9-55 of host cluster offset. Must be aligned to a
                    cluster boundary. If the offset is 0 and bit 63 is clear,
                    the cluster is unallocated. The offset may only be 0 with
                    bit 63 set (indicating a host cluster offset of 0) when an
                    external data file is used.

        56 - 61:    Reserved (set to 0)


Compressed Clusters Descriptor ``(x = 62 - (cluster_bits - 8))``::

    Bit  0 - x-1:   Host cluster offset. This is usually _not_ aligned to a
                    cluster or sector boundary!  If cluster_bits is
                    small enough that this field includes bits beyond
                    55, those upper bits must be set to 0.

         x - 61:    Number of additional 512-byte sectors used for the
                    compressed data, beyond the sector containing the offset
                    in the previous field. Some of these sectors may reside
                    in the next contiguous host cluster.

                    Note that the compressed data does not necessarily occupy
                    all of the bytes in the final sector; rather, decompression
                    stops when it has produced a cluster of data.

                    Another compressed cluster may map to the tail of the final
                    sector used by this compressed cluster.

If a cluster is unallocated, read requests shall read the data from the backing
file (except if bit 0 in the Standard Cluster Descriptor is set). If there is
no backing file or the backing file is smaller than the image, they shall read
zeros for all parts that are not covered by the backing file.

Extended L2 Entries
-------------------

An image uses Extended L2 Entries if bit 4 is set on the incompatible_features
field of the header.

In these images standard data clusters are divided into 32 subclusters of the
same size. They are contiguous and start from the beginning of the cluster.
Subclusters can be allocated independently and the L2 entry contains information
indicating the status of each one of them. Compressed data clusters don't have
subclusters so they are treated the same as in images without this feature.

The size of an extended L2 entry is 128 bits so the number of entries per table
is calculated using this formula:

.. code::

    l2_entries = (cluster_size / (2 * sizeof(uint64_t)))

The first 64 bits have the same format as the standard L2 table entry described
in the previous section, with the exception of bit 0 of the standard cluster
descriptor.

The last 64 bits contain a subcluster allocation bitmap with this format:

Subcluster Allocation Bitmap (for standard clusters)::

    Bit  0 - 31:    Allocation status (one bit per subcluster)

                    1: the subcluster is allocated. In this case the
                       host cluster offset field must contain a valid
                       offset.
                    0: the subcluster is not allocated. In this case
                       read requests shall go to the backing file or
                       return zeros if there is no backing file data.

                    Bits are assigned starting from the least significant
                    one (i.e. bit x is used for subcluster x).

        32 - 63     Subcluster reads as zeros (one bit per subcluster)

                    1: the subcluster reads as zeros. In this case the
                       allocation status bit must be unset. The host
                       cluster offset field may or may not be set.
                    0: no effect.

                    Bits are assigned starting from the least significant
                    one (i.e. bit x is used for subcluster x - 32).

Subcluster Allocation Bitmap (for compressed clusters)::

    Bit  0 - 63:    Reserved (set to 0)
                    Compressed clusters don't have subclusters,
                    so this field is not used.

Snapshots
---------

qcow2 supports internal snapshots. Their basic principle of operation is to
switch the active L1 table, so that a different set of host clusters are
exposed to the guest.

When creating a snapshot, the L1 table should be copied and the refcount of all
L2 tables and clusters reachable from this L1 table must be increased, so that
a write causes a COW and isn't visible in other snapshots.

When loading a snapshot, bit 63 of all entries in the new active L1 table and
all L2 tables referenced by it must be reconstructed from the refcount table
as it doesn't need to be accurate in inactive L1 tables.

A directory of all snapshots is stored in the snapshot table, a contiguous area
in the image file, whose starting offset and length are given by the header
fields snapshots_offset and nb_snapshots. The entries of the snapshot table
have variable length, depending on the length of ID, name and extra data.

Snapshot table entry::

    Byte 0 -  7:    Offset into the image file at which the L1 table for the
                    snapshot starts. Must be aligned to a cluster boundary.

         8 - 11:    Number of entries in the L1 table of the snapshots

        12 - 13:    Length of the unique ID string describing the snapshot

        14 - 15:    Length of the name of the snapshot

        16 - 19:    Time at which the snapshot was taken in seconds since the
                    Epoch

        20 - 23:    Subsecond part of the time at which the snapshot was taken
                    in nanoseconds

        24 - 31:    Time that the guest was running until the snapshot was
                    taken in nanoseconds

        32 - 35:    Size of the VM state in bytes. 0 if no VM state is saved.
                    If there is VM state, it starts at the first cluster
                    described by first L1 table entry that doesn't describe a
                    regular guest cluster (i.e. VM state is stored like guest
                    disk content, except that it is stored at offsets that are
                    larger than the virtual disk presented to the guest)

        36 - 39:    Size of extra data in the table entry (used for future
                    extensions of the format)

        variable:   Extra data for future extensions. Unknown fields must be
                    ignored. Currently defined are (offset relative to snapshot
                    table entry):

                    Byte 40 - 47:   Size of the VM state in bytes. 0 if no VM
                                    state is saved. If this field is present,
                                    the 32-bit value in bytes 32-35 is ignored.

                    Byte 48 - 55:   Virtual disk size of the snapshot in bytes

                    Byte 56 - 63:   icount value which corresponds to
                                    the record/replay instruction count
                                    when the snapshot was taken. Set to -1
                                    if icount was disabled

                    Version 3 images must include extra data at least up to
                    byte 55.

        variable:   Unique ID string for the snapshot (not null terminated)

        variable:   Name of the snapshot (not null terminated)

        variable:   Padding to round up the snapshot table entry size to the
                    next multiple of 8.


Bitmaps
-------

As mentioned above, the bitmaps extension provides the ability to store bitmaps
related to a virtual disk. This section describes how these bitmaps are stored.

All stored bitmaps are related to the virtual disk stored in the same image, so
each bitmap size is equal to the virtual disk size.

Each bit of the bitmap is responsible for strictly defined range of the virtual
disk. For bit number bit_nr the corresponding range (in bytes) will be:

.. code::

    [bit_nr * bitmap_granularity .. (bit_nr + 1) * bitmap_granularity - 1]

Granularity is a property of the concrete bitmap, see below.


Bitmap directory
----------------

Each bitmap saved in the image is described in a bitmap directory entry. The
bitmap directory is a contiguous area in the image file, whose starting offset
and length are given by the header extension fields ``bitmap_directory_offset`` and
``bitmap_directory_size``. The entries of the bitmap directory have variable
length, depending on the lengths of the bitmap name and extra data.

Structure of a bitmap directory entry::

    Byte 0 -  7:    bitmap_table_offset
                    Offset into the image file at which the bitmap table
                    (described below) for the bitmap starts. Must be aligned to
                    a cluster boundary.

         8 - 11:    bitmap_table_size
                    Number of entries in the bitmap table of the bitmap.

        12 - 15:    flags
                    Bit
                      0: in_use
                         The bitmap was not saved correctly and may be
                         inconsistent. Although the bitmap metadata is still
                         well-formed from a qcow2 perspective, the metadata
                         (such as the auto flag or bitmap size) or data
                         contents may be outdated.

                      1: auto
                         The bitmap must reflect all changes of the virtual
                         disk by any application that would write to this qcow2
                         file (including writes, snapshot switching, etc.). The
                         type of this bitmap must be 'dirty tracking bitmap'.

                      2: extra_data_compatible
                         This flags is meaningful when the extra data is
                         unknown to the software (currently any extra data is
                         unknown to QEMU).
                         If it is set, the bitmap may be used as expected, extra
                         data must be left as is.
                         If it is not set, the bitmap must not be used, but
                         both it and its extra data be left as is.

                    Bits 3 - 31 are reserved and must be 0.

             16:    type
                    This field describes the sort of the bitmap.
                    Values:
                      1: Dirty tracking bitmap

                    Values 0, 2 - 255 are reserved.

             17:    granularity_bits
                    Granularity bits. Valid values: 0 - 63.

                    Note: QEMU currently supports only values 9 - 31.

                    Granularity is calculated as
                        granularity = 1 << granularity_bits

                    A bitmap's granularity is how many bytes of the image
                    accounts for one bit of the bitmap.

        18 - 19:    name_size
                    Size of the bitmap name. Must be non-zero.

                    Note: QEMU currently doesn't support values greater than
                    1023.

        20 - 23:    extra_data_size
                    Size of type-specific extra data.

                    For now, as no extra data is defined, extra_data_size is
                    reserved and should be zero. If it is non-zero the
                    behavior is defined by extra_data_compatible flag.

        variable:   extra_data
                    Extra data for the bitmap, occupying extra_data_size bytes.
                    Extra data must never contain references to clusters or in
                    some other way allocate additional clusters.

        variable:   name
                    The name of the bitmap (not null terminated), occupying
                    name_size bytes. Must be unique among all bitmap names
                    within the bitmaps extension.

        variable:   Padding to round up the bitmap directory entry size to the
                    next multiple of 8. All bytes of the padding must be zero.


Bitmap table
------------

Each bitmap is stored using a one-level structure (as opposed to two-level
structures like for refcounts and guest clusters mapping) for the mapping of
bitmap data to host clusters. This structure is called the bitmap table.

Each bitmap table has a variable size (stored in the bitmap directory entry)
and may use multiple clusters, however, it must be contiguous in the image
file.

Structure of a bitmap table entry::

    Bit       0:    Reserved and must be zero if bits 9 - 55 are non-zero.
                    If bits 9 - 55 are zero:
                      0: Cluster should be read as all zeros.
                      1: Cluster should be read as all ones.

         1 -  8:    Reserved and must be zero.

         9 - 55:    Bits 9 - 55 of the host cluster offset. Must be aligned to
                    a cluster boundary. If the offset is 0, the cluster is
                    unallocated; in that case, bit 0 determines how this
                    cluster should be treated during reads.

        56 - 63:    Reserved and must be zero.


Bitmap data
-----------

As noted above, bitmap data is stored in separate clusters, described by the
bitmap table. Given an offset (in bytes) into the bitmap data, the offset into
the image file can be obtained as follows::

    image_offset(bitmap_data_offset) =
        bitmap_table[bitmap_data_offset / cluster_size] +
            (bitmap_data_offset % cluster_size)

This offset is not defined if bits 9 - 55 of bitmap table entry are zero (see
above).

Given an offset byte_nr into the virtual disk and the bitmap's granularity, the
bit offset into the image file to the corresponding bit of the bitmap can be
calculated like this::

    bit_offset(byte_nr) =
        image_offset(byte_nr / granularity / 8) * 8 +
            (byte_nr / granularity) % 8

If the size of the bitmap data is not a multiple of the cluster size then the
last cluster of the bitmap data contains some unused tail bits. These bits must
be zero.


Dirty tracking bitmaps
----------------------

Bitmaps with ``type`` field equal to one are dirty tracking bitmaps.

When the virtual disk is in use dirty tracking bitmap may be ``enabled`` or
``disabled``. While the bitmap is ``enabled``, all writes to the virtual disk
should be reflected in the bitmap. A set bit in the bitmap means that the
corresponding range of the virtual disk (see above) was written to while the
bitmap was ``enabled``. An unset bit means that this range was not written to.

The software doesn't have to sync the bitmap in the image file with its
representation in RAM after each write or metadata change. Flag ``in_use``
should be set while the bitmap is not synced.

In the image file the ``enabled`` state is reflected by the ``auto`` flag. If this
flag is set, the software must consider the bitmap as ``enabled`` and start
tracking virtual disk changes to this bitmap from the first write to the
virtual disk. If this flag is not set then the bitmap is disabled.