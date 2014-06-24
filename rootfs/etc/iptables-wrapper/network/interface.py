'''
Created on 31 мая 2014 г.

@author: volodja
'''


from utility.shell import executeShellCommand


class Interface():

    def __init__(self, name):
        self.__name = name
        self.__info = executeShellCommand("ifconfig " + self.__name)
        assert(len(self.__info) > 5)
        
    def getInfo(self):
        return self.__info 

    def getName(self):
        return self.__name
    
    def getIPv4(self):
        return self.__info[1].strip().split(' ', 2)[1].split(':', 2)[1]

    def getMac(self):
        return self.__info[0].strip().split(' ')[-1]

    def getIPv4Mask(self):
        return self.__info[1].strip().split(' ')[-1].split(':')[-1]
    