'''
Created on 14 июня 2014 г.

@author: volodja
'''


from network.interface          import Interface
from network.iptables           import IPTables 
from network.firewall_profile   import Firewall, Profile

internet    = Interface("eth1")
iptables    = IPTables()
firewall    = Firewall(iptables)

firewall.allowICMP([internet])

firewall.allowClient([internet], 
     [Profile.SSH, 
      Profile.NTP, 
      Profile.NFS, 
      Profile.Proxy, 
      Profile.Quake3, 
      Profile.Linphone,
      Profile.TransmissionGUI
])

iptables.save("/etc/iptables.config")
