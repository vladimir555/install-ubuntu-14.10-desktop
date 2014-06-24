#wget "http://download.skype.com/linux/skype-ubuntu-precise_4.3.0.37-1_i386.deb"
wget "http://www.skype.com/go/getskype-linux-beta-ubuntu-64" -O skype.deb
dpkg -i skype.deb || apt-get -y install -f