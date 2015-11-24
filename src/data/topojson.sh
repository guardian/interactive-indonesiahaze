#!/bin/bash
ROOTDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"/../..
DATAIN="$ROOTDIR/data"
DATAOUT="$ROOTDIR/data/out"


# ogr2ogr \
#   -overwrite \
#   -f GeoJSON \
#   -where "ADM0_A3 IN ('IDN', 'MYS', 'SGP', 'KHM', 'BRU', 'THA', 'VNM', 'PHL')" \
#   $DATAOUT/geo.json \
#   $DATAIN/countries/ne_10m_admin_0_countries.shp
#   # data/ne_10m_admin_0_map_subunits.shp

# ogr2ogr \
#   -overwrite \
#   -f GeoJSON \
#   $DATAOUT/palmoil.json \
#   $DATAIN/palmoilconcessions/Indonesia_oil_palm_concessions.shp


# ogr2ogr \
#   -overwrite \
#   -f GeoJSON \
#   $DATAOUT/fiber.json \
#   $DATAIN/woodfiberplantations/Indonesia_wood_fiber_plantations.shp


# ogr2ogr \
#   -overwrite \
#   -f GeoJSON \
#   -where "COUNTRY IN ('INDONESIA')" \
#   $DATAOUT/logging.json \
#   $DATAIN/logging/GFW_logging_20131023.shp

rm $DATAOUT/merged_fires.shp
rm $DATAOUT/fires.json
ogr2ogr -f "ESRI Shapefile" $DATAOUT/merged_fires.shp $DATAIN/nasa2/firms281271447607437_NRT.shp
ogr2ogr -f "ESRI Shapefile" -update -append $DATAOUT/merged_fires.shp $DATAIN/nasa3/firms284631448365501_NRT.shp -nln merged_fires

ogr2ogr \
  -overwrite \
  -f GeoJSON \
  $DATAOUT/fires.json \
  $DATAOUT/merged_fires.shp

# ogr2ogr \
#   -overwrite \
#   -f GeoJSON \
#   -sql "SELECT Shape_Area from idn_forest_moratorium" \
#   -lco COORDINATE_PRECISION=6 \
#   $DATAOUT/moratorium.json \
#   $DATAIN/moratorium/idn_forest_moratorium.shp

$ROOTDIR/node_modules/.bin/babel-node --harmony $ROOTDIR/src/data/fires.js

topojson \
  -o $DATAOUT/indonesia.topojson \
  --id-property SU_A3 \
  -q 1e4 \
  -p name=NAME -p date=ACQ_DATE -p confidence=CONFIDENCE -p frp=FRP \
  -- $DATAOUT/filteredfires.json
  # -s 0.000000005 -q 1e6 \
  # $DATAOUT/geo.json \
  # $DATAOUT/palmoil.json \
  # $DATAOUT/logging.json \
  # $DATAOUT/fiber.json \
