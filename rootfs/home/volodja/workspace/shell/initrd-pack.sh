cd $1
#find | cpio --create -b | gzip > /tmp/initrd.tmp
find | cpio --quiet --dereference -o -H newc | gzip -9 > /tmp/initrd.tmp
mv /tmp/initrd.tmp $2
