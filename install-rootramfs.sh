git clone https://github.com/vladimir555/rootramfs &&
cd rootramfs &&
./create_deb.sh rootramfs_*all &&
dpkg -i rootramfs*all.deb
