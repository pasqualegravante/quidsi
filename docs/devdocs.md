# Development Documentation For Python Backend
This document contains useful notes for python backend development

## Notes on the urban graph format 
From the file `grafo_web.csv`, we observe the following format:  
wkb_geometry;codice;strada;desvia;fumetto;vifraz;sensouni;tipo_arco;tipo_cod;tipo_stra

### TIPO_COD
```
LINESTRING (659229.87 5103833.07,659234.62 5103832.28,659241.37 5103832.24,659249.21 5103833.41,659254.44 5103834.5,659262.44 5103837.0,659268.66 5103839.08,659272.68 5103841.3,659276.46 5103843.86,659281.75 5103848.5,659285.62 5103853.0)	8037	8037	VIA DEL PRAOL	VIA DEL PRAOL	TRENTO	0	PRINCIPALE	0

LINESTRING (663059.94 5107659.0,663038.94 5107732.5)	5790	5790	VIA NOCE	VIA NOCE	TRENTO	0	SECONDARIO	0

LINESTRING (663296.77329559 5103730.52079908,663301.162519675 5103735.71190064,663303.272723562 5103742.75998163,663309.729947457 5103748.4997362,663366.346717748 5103790.32397724,663394.88722532 5103811.5315263,663414.51212147 5103825.3744638,663417.550815068 5103827.48466769,663421.729018764 5103829.84809605,663425.759508189 5103831.11421838,663429.135834408 5103831.13532042,663433.799384998 5103829.86919808,663441.153445545 5103827.67458604)	2850	2850	LUNGADIGE SAN NICOLO'	LUNGADIGE SAN NICOLO'	TRENTO	0		0
```

Entries have the attribute `tipo_cod`, which is an enum with values:  
* `PRINCIPALE`
* `SECONDARIO`
* ` `
* (empty string)

MUST INFER THE MEANING BY LOOKING MAP.

### WKB_GEOMETRY
`wkb_geometry` field is of type `LINESTRING`, this type encodes a line as a string of 2D-coordinates
such as:  
`LINESTRING (664586.38 5110087.5,664608.25 5110105.5,664613.31 5110109.0,664618.72 5110110.64,664625 5110111,664645.31 5110106.5)`  

Each street in the urban graph is not rappresented as a single long line, instead
it's broke up in many adjacent segments, to prove try the following command:  
`cat grafo_web.csv | grep "VIA CASTEL DI CORTESANO"`  

You'll get the following output:
```
"LINESTRING (664586.38 5110087.5,664608.25 5110105.5,664613.31 5110109.0,664618.72 5110110.64,664625 5110111,664645.31 5110106.5)";8415;8415;VIA CASTEL DI CORTESANO;VIA CASTEL DI CORTESANO;TRENTO;0;;0;
"LINESTRING (664645.31 5110106.5,664681.38 5110098.5,664692.94 5110097.0,664696.94 5110097.0,664702.81 5110098.0,664706.56 5110099.5,664710.81 5110102.0,664726.62 5110114.0,664728.17 5110114.71,664730.1 5110115.1,664732 5110115,664733.94 5110114.5,664745.38 5110108.0,664759.37 5110106.5,664762.12 5110102.5,664765.25 5110094.5,664766.88 5110089.0,664771.75 5110066.0,664779.44 5110045.76,664782.25 5110036.88,664790.69 5110013.5)";8415;8415;VIA CASTEL DI CORTESANO;VIA CASTEL DI CORTESANO;TRENTO;0;;0;
"LINESTRING (664645.31 5110106.5,664641.27 5110090.55,664629.89 5110077.69,664626.47 5110071.7,664625.18 5110065.5,664616.44 5110016.5)";8415;8415;VIA CASTEL DI CORTESANO;VIA CASTEL DI CORTESANO;TRENTO;0;;0;
"LINESTRING (664592.5 5110167.0,664572.88 5110097.5,664572.83 5110093.44,664574.32 5110089.25,664577.9 5110086.77,664583.68 5110086.28,664586.38 5110087.5)";8415;8415;VIA CASTEL DI CORTESANO;VIA CASTEL DI CORTESANO;TRENTO;0;;0;
"LINESTRING (664586.38 5110087.5,664592.0 5110072.5,664590.38 5110060.5)";8415;8415;VIA CASTEL DI CORTESANO;VIA CASTEL DI CORTESANO;TRENTO;0;;0;
"LINESTRING (664507.11 5110244.19,664509.01 5110248.76,664510.44 5110255.53,664511.38 5110265.0,664512.88 5110276.52,664513.94 5110279.81,664514.87 5110282.7,664517.0 5110285.24,664519.14 5110286.6,664521.44 5110287.42,664523.56 5110287.45,664525.31 5110287.0,664527.26 5110285.95,664528.69 5110284.5,664530.43 5110281.34,664531.81 5110272.86,664532.62 5110265.5,664533.13 5110261.46,664534.64 5110257.03,664536.77 5110253.94,664539.23 5110250.77,664557.92 5110233.98,664569.01 5110219.88,664578.38 5110208.5,664582.56 5110202.0,664590.06 5110189.0,664592.06 5110183.0,664592.88 5110179.0,664593.19 5110175.0,664593.12 5110171.0,664592.5 5110167.0)";8415;8415;VIA CASTEL DI CORTESANO;VIA CASTEL DI CORTESANO;TRENTO;0;;0;
"LINESTRING (664502.53 5110239.46,664505.4 5110241.38,664507.11 5110244.19)";8415;8415;VIA CASTEL DI CORTESANO;VIA CASTEL DI CORTESANO;TRENTO;0;;0;
"LINESTRING (664496.13 5110235.27,664502.53 5110239.46)";8415;8415;VIA CASTEL DI CORTESANO;VIA CASTEL DI CORTESANO;TRENTO;0;;0;
```

The coordinates specified can be viewed on an online wkt viewer as segment on the map.  
[https://wktmap.com/](https://wktmap.com/)  
BE CAREFUL THESE COORDINATE HAVE **ESPG:32632**.

ESPG is an id for geographic rules used to interpret the given coordinates.
To further inspect the provided code follow the official link:  
[epsg32632](https://epsg.org/crs_32632/WGS-84-UTM-zone-32N.html?sessionkey=rug85mxcg4)  

## Server Graph Rappresentation
MAIN INFOS:
* The graph is directed: need to rappresent correctly one-way and two-way streets
* The graph must be stripped to the bare minimum data
* New data must be ASSOCIATED to the streets, thus the edges of the graph, such as different types of weights, is_closed, coefficient_of_viability, ...

### STORE THE EDGES
An internal graph rappresentation could be done in this way:
* keep the segmentation of streets as in the given official API
* create a function to store edges, it must take a CSV entry as an input

Suppose we want to save the following entry as an edge (A,B).
```
wkb_geometry;codice;strada;desvia;fumetto;vifraz;sensouni;tipo_arco;tipo_cod;tipo_stra  

"LINESTRING (664586.38 5110087.5,664608.25 5110105.5,664613.31 5110109.0,664618.72 5110110.64,664625 5110111,664645.31 5110106.5)";
8415;
8415;
VIA CASTEL DI CORTESANO;
VIA CASTEL DI CORTESANO;
TRENTO;0;;0;
```

Then, (pasquale)I'd save it like this:  
```python
g.add_edge("664586.38 5110087.5", "664645.31 5110106.5", {id: 8415, ...})
```

In this way we keep information of start-end of the street's segment, and then we keep the associated id.

### ASSOCIATED DATA TO THE EDGES
First of all, new data must be associated to the edges.
Some new data should be persistently saved on a database, such as:
* ff
Other data should be calculated each time is ned, that is very volatile data:
* ffg

The new data is:
* weight: it could be one weight, but I'd prefer it to be a function of different coefficients
* various coefficients: viability, comfortness, width, length, dislevel, 

The coefficients might be related in some way, this should be well determined.