wget -c "http://eclipse.mirror.triple-it.nl/technology/epp/downloads/release/kepler/SR2/eclipse-standard-kepler-SR2-linux-gtk-x86_64.tar.gz" -O eclipse.tar.gz  &&
tar xf eclipse.tar.gz &&
chown -R volodja:volodja eclipse
mv eclipse /home/volodja/eclipse-kepler
