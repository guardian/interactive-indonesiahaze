#!/bin/bash
ROOTDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"/../..
DATAIN="$ROOTDIR/data"
DATAOUT="$ROOTDIR/data/out"


ogr2ogr \
  -overwrite \
  -f GeoJSON \
  -where "ADM0_A3 IN ('IDN', 'MYS', 'SGP', 'KHM', 'BRU', 'THA', 'VNM', 'PHL')" \
  $DATAOUT/geo.json \
  $DATAIN/countries/ne_10m_admin_0_countries.shp
  # data/ne_10m_admin_0_map_subunits.shp

ogr2ogr \
  -overwrite \
  -f GeoJSON \
  $DATAOUT/palmoil.json \
  $DATAIN/palmoilconcessions/Indonesia_oil_palm_concessions.shp


ogr2ogr \
  -overwrite \
  -f GeoJSON \
  $DATAOUT/fiber.json \
  $DATAIN/woodfiberplantations/Indonesia_wood_fiber_plantations.shp


ogr2ogr \
  -overwrite \
  -f GeoJSON \
  -where "COUNTRY IN ('INDONESIA')" \
  $DATAOUT/logging.json \
  $DATAIN/logging/GFW_logging_20131023.shp

ogr2ogr \
  -overwrite \
  -f GeoJSON \
  $DATAOUT/fires.json \
  $DATAIN/nasa/firms275521446295496_NRT.shp


ogr2ogr \
  -overwrite \
  -f GeoJSON \
  -sql "SELECT Shape_Area from idn_forest_moratorium" \
  -lco COORDINATE_PRECISION=6 \
  $DATAOUT/moratorium.json \
  $DATAIN/moratorium/idn_forest_moratorium.shp


topojson \
  -o $DATAOUT/indonesia.topojson \
  --id-property SU_A3 \
  -s 0.000000005 -q 1e6 \
  -p name=NAME -p date=ACQ_DATE -p confidence=CONFIDENCE -p frp=FRP -p iso3=ADM0_A3 \
  -- \
  $DATAOUT/geo.json \
  $DATAOUT/palmoil.json \
  $DATAOUT/logging.json \
  $DATAOUT/fires.json \
  $DATAOUT/fiber.json
