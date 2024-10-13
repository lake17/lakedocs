---
title: Build and boot a Linux kernel to create your own system
prev: false
---

in my experience, many network engineers lack an intuition about what linux is and how it works, despite its increasing importance in our field.
counting myself among them, i set out to deepen my understanding.
the foremost resource for that purpose is Linux From Scratch, but after skimming through the book, i felt that i first needed a higher level overview of the material.
this article is the first in a series intended to supplement LFS.

if you'd like to follow along, the article was written from a clean install of Ubuntu 22.04.3 LTS.

```shell
sudo apt install --yes qemu-system-x86-64 libguestfs-tools build-essential git bison flex libelf-dev libssl-dev libncurses5-dev
mkdir LFSp && cd "$_"
```

we first install the required packages. those important to know will be
discussed further on. we'll also create a working directory for the sake
of tidiness, and change into it.

## stage0 - running a linux kernel

linux is a type of computer program called a kernel. a kernel manages
resources (e.g. RAM), and provides an interface through which
applications can use them. despite what you may have read, linux is not
an operating system; what that means in practice will become clear
shortly. when a linux system boots, the kernel is loaded into memory
from a compressed image on disk. that image, along with everything else
required at boot time, can by convention be found in the /boot
directory.

in our case the kernel image currently in use is
`vmlinuz-6.2.0-39-generic`. (if you are curious about the filename, it
is an abbreviation of "Virtual Memory Linux Gzip", another convention).
check its permissions and ensure that it is readable as above, otherwise
we will run into problems.

having found the linux kernel image used by our currently running
system, what do you suppose happens if we boot it? to find out, we'll
use a program called qemu.

```shell
qemu-system-x86_64 -m 512M -kernel /boot/vmlinuz
```

`qemu-system-x86_64` is an emulator for PC systems (that is, [IBM PC compatible](https://en.wikipedia.org/wiki/IBM_PC_compatible#The_IBM_PC_compatible_today)
systems) based on the AMD64 architecture - qemu can emulate many
platforms, but this is what we will use because of its ubiquity. we give
it some memory with the `-m` flag, and it will very kindly load our
kernel for us directly, allowing us to sidestep the hassle of creating a
bootable disk image (for now). in the new window that appears you will
see rapidly scrolling output as the kernel initializes, which stops just
as rapidly when the kernel "panics" (crashes). so, we have answered our
earlier question - when we run a linux kernel directly, it crashes
almost immediately.

let's explore why that is, and what we can do about it.

## stage1 - mounting a root filesystem

`[    1.949579] Kernel panic - not syncing: VFS: Unable to mount root fs on unknown-block(0,0)`

the kernel is letting us know that it can't boot without a filesystem.
it does not tell us why, but to be fair, inside the error emitted during
a kernel panic is hardly the time or place. we will find out why soon
enough; for now, we need to tell our kernel on which device the root
filesystem can be found; to do so we pass it the [boot parameter](https://man7.org/linux/man-pages/man7/bootparam.7.html)
`root=`. let's create a disk image to provide to qemu, which will make
it available for our linux kernel to use. there are many ways to do
this, but the tool `virt-make-fs` works well and abstracts away the
details, so we'll use it.

```shell
mkdir rootfs
virt-make-fs --format=qcow2 --type=ext2 rootfs rootfs.ext2.qcow2
```

we make a directory `rootfs` and use `virt-make-fs` to create a qcow2
disk image, on which is an ext2 filesystem containing the contents of
the aformentioned directory (currently, nothing). now we can try booting
again:

```shell
qemu-system-x86_64 -m 512M -kernel /boot/vmlinuz -hda rootfs.ext2.qcow2 -append "root=/dev/sda"
```

`-hda` attaches the image file we created to our linux kernel as a SCSI
device. `-append` passes parameters to the kernel, and in this case it
sets the value of `root=` to `/dev/sda`. `/dev/sda` is a path
representing the first SCSI device attached to the system; subsequent
devices are named sdb, sdc, and so on.

executing this command, we hit a different panic.

## stage2 - executing an init program

`[    1.966493] Kernel panic - not syncing: No working init found.  Try passing init= option to kernel. See Linux Documentation/admin-guide/init.rst for guidance.`

the kernel found our root filesystem, and looked there unsuccessfully
for a program called `init`. `init` is a user level program which the
kernel executes as the final step of initialization. let's create our
own example init program and see if our linux kernel will run it.

```sh
mkdir rootfs/sbin
gcc -static -o rootfs/sbin/init -x c - << EOF
#include <stdio.h>
#include <unistd.h>

void main() {
    while(1){
      printf("Hello, World!\n");
      sleep(1);
    }
}
EOF
virt-make-fs --format=qcow2 --type=ext2 rootfs rootfs.ext2.qcow2
```

this is a simple C program that will print "Hello, World!" every second
in an infinite loop. the details of the program and how it is compiled
are not important for our purposes, save two points. firstly that we
have written the program as an infinite loop quite deliberately - what
do you suppose would have happened if we hadn't? and secondly that we
have built the program statically, meaning that its dependencies are
included in the resulting binary - it does not require access to any
shared libraries, which is good, because it is currently the only file
on our disk.

+we make a directory called `sbin` because that is the first place linux
looks for an `init` program; alternatively we could provide the `init=`
parameter to tell the kernel what the program is called and where on our
root filesystem it is located. we also need to remember to recreate our
rootfs disk image with `virt-make-fs` now that we've modified the
directory it is built from.

```shell
qemu-system-x86_64 -m 512M -kernel /boot/vmlinuz -hda rootfs.ext2.qcow2 -append "root=/dev/sda"
```

granted, it's not very useful, but at least it hasn't crashed - we
finally have our linux kernel running. i hope you can see now that it is
not (only) pedantry that drives some to insist on linux' status as
"just" a kernel and not an OS; the distinction is an important one.
(okay, in some contexts it is fine to refer to the "Linux operating
system"; just don't get confused) building an operating system with the
linux kernel at the centre is the job of distributions, and the focus of
Linux From Scratch, so we won't explore it in this primer. instead: qemu
has been giving us quite a leg up by running our kernel directly for us,
and that's not cricket.

## stage3 - booting from disk with UEFI

you likely know what a BIOS is and does; you may not know that almost no
modern computers ship with a BIOS - they now use UEFI. these are in fact
entirely different things, although some mistakenly (but understandably)
believe that BIOS is a generic term, and that UEFI is a "type of" BIOS.
because BIOS is by now a legacy standard, we will be using qemu's UEFI
firmware, which is called OVMF, to boot our kernel image from disk. this
is a topic that can get very complicated, but fortunately for our
purposes there are only four major concepts we need to understand:

1. the UEFI boot manager

    this is the program, included in implementations of UEFI, that is
    responsible for (among other things) loading UEFI applications. the boot
    manager is programmable via variables which are written to an NVRAM chip
    on your motherboard (similar to the older CMOS chip and battery system
    it replaced). "boot options" are a type of NVRAM variable which contain
    a pointer to a hardware device and to a file on that device, which is
    the UEFI application to be loaded.

2. UEFI applications

    these are just programs that have been written in a
    particular way, such that they can be loaded by the boot manager. boot
    loaders are an example of the sort of program that would be written in
    this way; much like how a linux kernel runs and hands off control to
    `init`, UEFI can execute a boot loader program, which will then handle
    starting your OS.

3. GUID partition tables

    GPT is a standard for the layout of partition tables, and all compliant
    UEFI firmware is required to be able to understand it. as UEFI replaced
    BIOS, GPT replaced MBR-based partitioning schemes.

4. EFI system partitions

    an ESP is a FAT-formatted partition given a specific GPT partition type, and again, all compliant UEFI firmware is
    required to be able to read it.

if you are interested and want more details about any of this, i highly
recommend going straight to the [UEFI specification](https://uefi.org/specs/UEFI/2.10/index.html), because
sadly the web is full of misinformation about UEFI. but with the
information we have now, we can piece together what is required: we must
create a new GPT-partitioned disk image, create an EFI system partition
on the disk, write a UEFI application that will boot our linux image,
copy it to the ESP, write a boot option describing the location of the
application and write it to NVRAM. needless to say, this is quite a lot
of work.

```shell
mkdir --parents rootfs/EFI/BOOT
cp /boot/vmlinuz rootfs/EFI/BOOT/BOOTx64.EFI
virt-make-fs --format=qcow2 --type=fat rootfs rootfs.fat.qcow2
```

so let's cheat. in the absence of any valid boot option, the boot
manager will enumerate all devices and attempt to boot from each, using
the default path `\EFI\BOOT\BOOT[machine type short-name].EFI`
the specification [states](https://uefi.org/specs/UEFI/2.10/02_Overview.html#overview)
"An UEFI-defined System Partition is required by UEFI to boot from a
block device" happily for us, however, OVMF will find and execute
`BOOTx64.EFI` on any FAT filesystem - it does not require the image to
be on an ESP, nor even that the filesystem be partitioned at all. we'll
take advantage of that fact and skip creating an ESP for now - it will
be covered in detail in the next article in this series.

you might be surprised to see that we can just rename our kernel image and have UEFI boot it - does this mean that linux is a UEFI application?
if compiled with the configuration option CONFIG_EFI_STUB enabled, yes;
this is called the [EFI Boot
Stub](https://docs.kernel.org/admin-guide/efi-stub.html) and it has
saved us a great deal of effort.

as complex as this seemed at first, in practice all we've needed to do
is rename our kernel image and store it in a particular location on a
FAT formatted disk. now we can boot it:

```shell
qemu-system-x86_64 -m 512M -bios /usr/share/qemu/OVMF.fd -hda rootfs.fat.qcow2
```

of course, this does not work; attentive readers will have already
spotted the problem.

## stage4 - creating an initramfs

now that qemu is no longer booting our kernel for us, it can't pass
along the required boot parameter `root=`. OVMF is able to find and boot
our kernel image from the disk we provided, but we are again seeing a
panic because the kernel doesn't know on what device to find the root
filesystem. we have a few options to fix this, but first we will take
this opportunity to introduce another method by which linux can boot:
initramfs.

`root=` has some serious limitations, which led to the development of
alternative solutions, including initramfs. for instance, what if our
root filesystem is encrypted, or located on a network share? the kernel
can't be expected to know how to handle complex cases like these. an
initramfs image is a compressed archive of a particular format, which
the linux kernel extracts into a small RAM-based root filesystem called,
funnily enough, rootfs. it can be loaded at runtime, or bundled in to
the kernel at compile time. after extracting, the kernel checks this
filesystem for an `init` program and if found, dutifully runs it for us.
from that point on, the kernel is absolved of responsibility, and it is
the job of `init` to get the real system up and running.

for more information, the [kernel documentation](https://www.kernel.org/doc/html/latest/filesystems/ramfs-rootfs-initramfs.html?highlight=initramfs)
is the best resource.

```shell
mkdir --parents initramfs/EFI/BOOT
cp rootfs/EFI/BOOT/BOOTx64.EFI initramfs/EFI/BOOT/vmlinuz.EFI
```

first we'll create a new directory for our initramfs, and copy the
kernel image from our rootfs into it. we need to rename it because we no
longer want OVMF to boot it for us.

```shell
(
cd rootfs/sbin
echo init | cpio --quiet --create --format=newc | gzip > ../../initramfs/initramfs_data.cpio.gz
)
```

the 'particular format' required for an initramfs we mentioned earlier
is an SVR4 cpio archive, compressed with gzip. gzip is a very common
compression format that you have likely come across before, but cpio is
rather more esoteric. the `cpio` tool creates archives from a list of
filenames; as we only wish to copy `init` to our initramfs, that is the
only name we provide. `--format=newc` ensures we create an SVR4 archive;
by default, `cpio` uses an obsolete binary format. the archive is then
piped to `gzip`, which compresses it and writes it out to the initramfs
directory.

having created an initramfs image, we need to provide it to our kernel
somehow. bundling it in at build time is a little involved, so we will
come to it later, and for now let's see how the kernel can load an
initramfs image at runtime.

```shell
cat > initramfs/startup.nsh << EOF
vmlinuz.EFI initrd=initramfs_data.cpio.gz
EOF
virt-make-fs --format=qcow2 --type=fat initramfs initramfs.fat.qcow2
```

the kernel parameter `initrd=` is used to specify the location of the
initramfs image, and to actually pass it to the kernel, we will make use
of the UEFI shell. UEFI firmware provides a shell environment (with a
[specification](https://uefi.org/sites/default/files/resources/UEFI_Shell_2_2.pdf)
of its own) which can be used for tasks like launching UEFI applications
and modifying NVRAM variables. we can run `vmlinuz.EFI` from the shell
ourselves, but having to do that manually at every boot would be
inconvenient - luckily we don't have to. OVMF drops into the shell when
it fails to boot, and when the shell initializes, it tries to run a
special script called `startup.nsh`. we create that script file, and
inside it we provide the name of the application we want to execute and
its arguments.

```shell
qemu-system-x86_64 -m 512M -bios /usr/share/qemu/OVMF.fd -hda initramfs.fat.qcow2 -net none
```

(we use `-net none` here because without it OVMF will attempt a network
boot, and we don't want to have to wait for that to time out.) this
works, but it is a bit of a hack, and slows our boot time considerably.
so let us explore the second, more fun approach to loading our initramfs
image - building it into the kernel!

## stage5 - building a custom kernel

perhaps compiling your own kernel seems daunting, but really it is very
simple, and to know how to do it for yourself is a useful skill.

let's grab the kernel source code. we use `--depth 1` to create a
shallow clone, pulling only the latest commit and not the entire
history.

```shell
git clone --depth 1 git://git.kernel.org/pub/scm/linux/kernel/git/torvalds/linux.git
```

there are several ways we can bundle our initramfs into the kernel. for
us, the simplest option would be to provide the kernel with the filepath
to our image - we've already prepared it in the correct format, so we
can have the build process unpack it directly. if we hadn't already
packaged our files up, the kernel build can do it for us if we provide
it with a target directory, which is convenient. however the most
powerful method is to use a configuration file, so that is what we shall
do.

```shell
cp rootfs/sbin/init linux/usr/
cat > linux/usr/initramfs_list << EOF
dir /dev 0755 0 0
nod /dev/console 0600 0 0 c 5 1
file /init usr/init 500 0 0
EOF
```

we first copy our init program to a location accessible by the build
process, and then we create initramfs_list. this configuration file
describes what the contents of the initramfs should be, and the
`usr/gen_init_cpio.c` program makes it so. to explain each line in turn:

`dir /dev 0755 0 0` creates the directory `/dev`, and the numbers
following are its mode (access permissions and special mode flags).
`nod /dev/console 0600 0 0 c 5 1` creates the device node `/dev/console`
with the given mode, where `c 5 1` identifies the device; see
`linux/Documentation/admin-guide/devices.txt` for more information.
`file /init usr/init 500 0 0` creates the file `/init` from the local
file `usr/init` with the given mode.

the reason we now have to create `/dev/console` is that when we were
providing an external initramfs image, it was appended to the kernel's
default one (found at `linux/usr/default_cpio_list`) which included it
for us. when we bundle the image in at build time, it overwrites the
default, and without `/dev/console` we get no output when we boot our
system.

```shell
(
cd linux
make mrproper
make defconfig
scripts/config --set-str CONFIG_INITRAMFS_SOURCE usr/initramfs_list
scripts/config --enable CONFIG_CMDLINE_BOOL
scripts/config --set-str CONFIG_CMDLINE console=ttyS0
make olddefconfig
make -j "$(nproc)" --quiet
)
```

there are really only two stages to building the linux kernel -
configuration and compilation. to customise our kernel, we need to
modify a file called `.config` which contains a list of kernel
configuration options. we will use the `scripts/config` utility to do
this, because it allows for non-interactive configuration of kernel
build options from the command line, instead of the usual menu-based
methods. we then use the build tool `make` to compile the kernel with
the options we have specified. `make mrproper` cleans up the build
environment, and `make defconfig` sets the default options in `.config`.
`CONFIG_INITRAMFS_SOURCE` tells the kernel from where it can load an
initramfs image, and we point it at the configuration file we created;
however, this could also be set to an initramfs image or to a directory,
as described previously. when enabled, `CONFIG_CMDLINE_BOOL` allows us
to set `CONFIG_CMDLINE`, which we use to pass runtime parameters to the
kernel. `make olddefconfig` updates our `.config` file with the new
values we have set, and also sets any new options to their default value
rather than prompting the user to decide what to do. the final `make` is
what actually kicks off the kernel build process, and `-j "$(nproc)"`
allows it to use all of our CPU cores for faster compilation.

exercise for the reader: use `make allnoconfig` instead of
`make defconfig` to clear your `.config` of all kernel configuration
options, and then set the bare minimum number of kernel options required
to boot. note: i intended to do this myself for this post, but i could
not get it working. if you manage to figure it out, please do let me
know!

```shell
cp linux/arch/x86/boot/bzImage initramfs/EFI/BOOT/BOOTx64.EFI
virt-make-fs --format=qcow2 --type=fat initramfs initramfs.fat.qcow2
```

the output of the build process (i.e. the kernel), is written to
`linux/arch/x86/boot/bzImage`; we copy it to our initramfs directory and
rebuild our disk image.

```shell
qemu-system-x86_64 -m 512M -bios /usr/share/qemu/OVMF.fd -hda initramfs.fat.qcow2 -nographic
```

(we now have to use `-nographic` because our custom linux kernel has not
been built with support for graphics.) we are now successfully booting
linux from disk via UEFI and running our custom init program from an
initramfs!

## stage6 - busybox

it's about time we set aside our example init program and booted
something more useful. a great option for a minimal init program is
[busybox](https://busybox.net/about.html).

```shell
cat > linux/usr/initramfs_list << EOF
dir /dev 0755 0 0
nod /dev/console 0600 0 0 c 5 1
dir /bin 755 0 0
file /bin/busybox usr/busybox 755 0 0
file /init usr/init 500 0 0
EOF
```

we recognise most of this, but this time we are also creating a `/bin`
directory in which we put `busybox`.

```shell
(
cd linux/usr
wget https://busybox.net/downloads/binaries/1.35.0-x86_64-linux-musl/busybox
chmod +x busybox

cat > init << EOF
#!/bin/busybox sh
/bin/busybox --install /bin
exec sh
EOF
chmod +x init
)
```

we fetch a `busybox` binary from the website, make it executable, and
then create a new init file that utilizes it. the first line is
important - the kernel sees `#!` (called the 'shebang') and knows that
what comes next is a command which can interpret the remainder of the
file. then, `/bin/busybox --install /bin` creates hard links to
`/bin/busybox` for every 'applet' in the `/bin` directory. one such link
is `/bin/sh`, which we make immediate use of: the next, and final,
action of our init script is to run `exec sh`. `exec` replaces the
current process with the new process spawned by running the given
command, which is why it comes at the end - nothing written after `exec`
would be run. while not strictly necessary in our toy case (if we
directly ran `sh` it would be spawned as a child process; on exit it
would return to the parent process, which would find no further commands
to run and would itself exit) it is best practice, so better to get used
to it now.

```shell
(
cd linux
make -j "$(nproc)"
)
cp linux/arch/x86/boot/bzImage initramfs/EFI/BOOT/BOOTx64.EFI
virt-make-fs --format=qcow2 --type=fat initramfs initramfs.fat.qcow2
```

we now rebuild our kernel to use the new initramfs configuration file,
copy the resulting image to the initramfs directory, and create a new
disk image from it.

```shell
qemu-system-x86_64 -m 512M -bios /usr/share/qemu/OVMF.fd -hda initramfs.fat.qcow2 -nographic
```

now we finally have a useful system. feel free to play around with
`busybox` and its 'applets' before continuing - it's not uncommon to
find in the wild, especially on things like rescue disks and containers,
so it would not be a bad use of your time to become familiar with it.
exercise for the reader: using what you have learned so far, can you
create a bootable usb with this custom kernel and run it on your
hardware? answers on a postcard, please.

## stage7 - switch_root

at this point you may wonder what's left to do - we've booted a custom
linux kernel image from disk using UEFI, and we get a shell with a suite
of useful applications available. remember that we are still just
running the initramfs, whose job is to boot up the real OS on the root
filesystem. we could certainly try building a root filesystem for a
"real" linux system and have our initramfs load it, but that starts to
encroach on Linux From Scratch's territory, so isn't really appropriate
for this primer. lucky for us then that we already have a rootfs disk
image ready to go.

```shell
cat > linux/usr/initramfs_list << EOF
dir /proc 755 0 0
dir /sys 755 0 0
dir /dev 0755 0 0
nod /dev/console 0600 0 0 c 5 1
nod /dev/sdb 0600 0 0 b 8 16
dir /bin 755 1000 1000
file /bin/busybox usr/busybox 755 0 0
file /init usr/init 500 0 0
EOF
```

new here are the directories `/proc` and `/sys`, which are required in
order to mount `/dev/sdb`, the major and minor numbers of which we used
the previously mentioned `devices.txt` to find.

```shell
(
cd linux/usr
cat > init << EOFredshift
#!/bin/busybox sh
/bin/busybox --install /bin
mount -t proc proc /proc
mount -t sysfs sysfs /sys
mkdir /mnt
mount /dev/sdb /mnt
exec switch_root /mnt /sbin/init
EOF
chmod +x init
)
```

to access `/dev/sdb` we need to mount it; we create a directory `/mnt`
to use as a mount point. the key change here is that rather than having
`init` execute `sh` as its final step, we run a program called
`switch_root`. this changes our root directory to `/mnt`, discards the
initramfs (freeing the memory it had been using), and executes
`/sbin/init`

```shell
(
cd linux
make -j "$(nproc)"
)
cp linux/arch/x86/boot/bzImage initramfs/EFI/BOOT/BOOTx64.EFI
virt-make-fs --format=qcow2 --type=fat initramfs initramfs.fat.qcow2
```

and we boot for the final time:

```shell
qemu-system-x86_64 -m 512M -bios /usr/share/qemu/OVMF.fd -hda initramfs.fat.qcow2 -hdb rootfs.ext2.qcow2 -nographic
```

exercise for the reader: create one disk image containing both our
initramfs and rootfs and get it running.

that's as far as this primer can take you - i hope that it was of some
use. those so inclined can continue to part 2 in the series
