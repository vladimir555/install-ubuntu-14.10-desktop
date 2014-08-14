./autogen.sh                    &&
make clean                      &&
make distclean                  &&
./configure --prefix=/usr --libdir=/usr/lib${LIBDIRSUFFIX} LIBS='-ldl -lm'  &&
make -j10
#make install