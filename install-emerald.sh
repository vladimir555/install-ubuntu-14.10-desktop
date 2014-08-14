wget cgit.compiz.org/fusion/decorators/emerald/snapshot/emerald-0.9.5.tar.gz  &&
tar -zxf emerald-0.9.5.tar.gz   &&
cd       emerald-0.9.5          &&
./autogen.sh                    ||
./autogen.sh                    &&
make clean                      &&
make distclean                  &&
./configure --prefix=/usr --libdir=/usr/lib${LIBDIRSUFFIX} LIBS='-ldl -lm'  &&
make -j10                       &&
make install
