{
    "datasources": {
	    "references": {
	        "vector_tiles": {
	            "minzoom": {
	                "css": "minzoom",
	                "default-value": 0,
	                "type":"numeric",
	                "default-meaning": "First zoom where data is introduced.",
	                "doc": "Lowest zoom where data is stored for display on map. Set value to where data is first readable to save file size."
	            },
	            "maxzoom": {
	                "css":"maxzoom",
	                "default-value": 6,
	                "type":"numeric",
	                "default-meaning": "Last zoom data where is stored.",
	                "max-size": "22",
	                "doc": "Highest zoom where data is stored, data displays overzoomed beyond maxzoom. Set maxzoom, then zoom to higher zooms on the map to check render quality and determine optimal level."
	            },
	            "buffer-size": {
	                "css": "buffer-size",
	                "default-value": 0,
	                "default-meaning": "Padding around each tile.",
	                "type": "numeric",
	                "max-size": "128",
	                "doc": "Sets pixels added to outside of each tile to help with seamless rendering. Label data requires higher buffer size, lines and polygons require buffer size at least half their anticipated styling stroke width."
	            },
	            "projection": {
	                "css": "projection",
	                "default-value": "none",
	                "default-meaning": "Re-projection algorithm converting data into Web Mercator (EPSG:3857).",
	                "type": "string",
	                "doc": "Input data clipped to (±180/±85) WGS84 then reprojected to WebMercator."
	        	}
			},
	        "shapefile": {
	            "points": {
	                "css": "points",
	                "type": "trouble-shooting",
	                "doc": "Optimize large point-only shapefiles by removing all column data from .dxf file."
	            },
	            "label-polygons": {
	                "css": "label-polygons",
	                "type": "trouble-shooting",
	                "doc": "Create centroid point data for each polygon to prevent repeating labels across tiles."
	            }
	        },
	        "csv": {
	            "lat-lng": {
	                "css": "lat-lng",
	                "type": "trouble-shooting",
	                "doc": "Ensure latitude and longitude columns are labeled as named instead of x,y which results in file-type error."
	            },
	            "geom": {
	                "css": "geom",
	                "type": "trouble-shooting",
	                "doc": "Mapnik renderer requires the_geom column data as WKT, which results in file-type error."
	            }
	        }
    	}
	}
}