cp $1 /tmp/initrd.tmp
cd $2
cat /tmp/initrd.tmp | gunzip | cpio --extract
rm /tmp/initrd.tmp
