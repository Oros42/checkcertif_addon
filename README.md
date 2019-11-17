Work in progress !  

# checkcertif_plugin

Firefox's plugin  
  
[See the main project](https://github.com/Oros42/checkcertif)  

## Build

To build the firefox's plugin :  
```
./buid.sh
```

## Install
  
### Development version
  
In Firefox, go to [about:config](about:config) and set ```xpinstall.signatures.required``` to ```false```.  
If you whan to debug : got to ```about:debugging#/runtime/this-firefox``` and load the plugin.  
If you whan to only use it : got to ```about:addons```, and install from file.  
