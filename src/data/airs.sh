cd "$(dirname "${BASH_SOURCE[0]}")"/../../data/airs/frames
rm -rf *_out.png tmp
mkdir tmp
for file in *.png; do
    gdal_translate -of GTiff -a_ullr -180 90 180 -90 -a_srs EPSG:4326 ${file} tmp/${file%%.png}.tif
    gdalwarp -ts 360 182 -t_srs "+proj=robin +lon_0=0 +x_0=0 +y_0=0 +ellps=WGS84 +datum=WGS84 +units=m +no_defs" tmp/${file%%.png}.tif tmp/${file%%.png}_r.tif -dstnodata "255 255 255"
    gdal_translate -of PNG tmp/${file%%.png}_r.tif ${file%%.png}_out.png
done > /dev/null
rm *.xml
rm -r tmp

avconv -r 10 -i %d_out.png -b:v 100k ../../../src/video/airs.mp4
