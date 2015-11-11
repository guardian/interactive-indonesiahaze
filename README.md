
Python dependencies
-------------------
```
apt-get install -y python-dev python-numpy libhdf4-dev
pip install python-hdf4 colormath
```

AIRS video
--------
```
unzip AIRS.zip
mkdir data/airs/frames
python src/data/airs.py
avconv -r10 -i data/airs/frames/%d.png -b:v 100k out.mp4
```

JS video rendering
------------------
sudo apt-get install libcairo2-dev libjpeg8-dev libpango1.0-dev libgif-dev build-essential g++
