echo "deb http://repo.mate-desktop.org/archive/1.8/ubuntu $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/mate-desktop.list
wget -qO - http://mirror1.mate-desktop.org/debian/mate-archive-keyring.gpg | sudo apt-key add -
sudo apt-get update
sudo apt-get install \
 xinit qt4-qtconfig \
 mate-core mate-desktop-environment mate-notification-daemon \
 eom evince dconf-tools engrampa \
 mate-applets mate-sensors-applet
