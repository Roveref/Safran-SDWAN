# ============================================================================
# Geocoding dictionary — Safran SD-WAN sites
# Maps (country_code, location_prefix_8chars) → (lat, lon, canonical_label)
# For unknown sites, falls back to country centroid + deterministic hash offset.
# ============================================================================

import csv
import hashlib
import re
from pathlib import Path

# --- country centroids (fallback positions) ------------------------------
COUNTRY_CENTROID = {
    "AE": (24.42, 54.43, "United Arab Emirates"),
    "AU": (-33.87, 151.21, "Australia"),
    "BE": (50.85, 4.35, "Belgium"),
    "BR": (-22.9, -43.2, "Brazil"),
    "CA": (45.5, -73.57, "Canada"),
    "CH": (46.95, 7.45, "Switzerland"),
    "CN": (39.9, 116.4, "China"),
    "CZ": (49.75, 13.38, "Czech Republic"),
    "DE": (50.85, 10.45, "Germany"),
    "ES": (40.42, -3.7, "Spain"),
    "FR": (46.6, 2.4, "France"),
    "GB": (52.5, -1.9, "United Kingdom"),
    "IN": (19.07, 72.88, "India"),
    "IT": (41.9, 12.5, "Italy"),
    "JP": (35.68, 139.77, "Japan"),
    "KR": (37.57, 126.98, "South Korea"),
    "MA": (33.57, -7.58, "Morocco"),
    "MX": (21.0, -103.0, "Mexico"),
    "MY": (3.14, 101.69, "Malaysia"),
    "NL": (52.37, 4.9, "Netherlands"),
    "PL": (50.05, 21.0, "Poland"),
    "RO": (47.16, 27.58, "Romania"),
    "SA": (50.6, 6.0, "Safran Aerosystems BE"),
    "SG": (1.35, 103.82, "Singapore"),
    "SS": (17.37, 78.48, "Safran Sensing IN"),
    "TH": (18.58, 99.0, "Thailand"),
    "TN": (36.45, 10.73, "Tunisia"),
    "US": (39.8, -98.6, "United States"),
    "ZA": (-29.65, 31.05, "South Africa"),
}

# --- precise city positions (Safran-specific where possible) -------------
# Keys are (COUNTRY, 8-char-UPPER prefix of location in site_id)
CITIES = {
    # === FRANCE ===
    ("FR", "AJACCIO"):  (41.93,  8.74, "Ajaccio"),
    ("FR", "ARS"):      (49.09,  6.08, "Ars-sur-Moselle"),
    ("FR", "AUXERRE"):  (47.80,  3.57, "Auxerre"),
    ("FR", "BAYONNE"):  (43.49, -1.48, "Bayonne"),
    ("FR", "BESANCON"): (47.24,  6.02, "Besançon"),
    ("FR", "BIDOS"):    (43.17, -0.58, "Bidos"),
    ("FR", "BLAGSVS"):  (43.63,  1.37, "Blagnac"),
    ("FR", "BLAGNAC"):  (43.63,  1.37, "Blagnac"),
    ("FR", "BORDEAUX"): (44.84, -0.58, "Bordeaux"),
    ("FR", "BORDES"):   (43.26, -0.24, "Bordes"),
    ("FR", "BUCHELAY"): (48.98,  1.68, "Buchelay"),
    ("FR", "CAUDEBEC"): (49.52,  0.73, "Caudebec"),
    ("FR", "CESSON"):   (48.11, -1.60, "Cesson-Sévigné"),
    ("FR", "CHARMEIL"): (46.17,  3.42, "Charmeil"),
    ("FR", "CHATEAUD"): (48.07,  1.33, "Châteaudun"),
    ("FR", "CHATEAUN"): (47.86,  1.68, "Châteauneuf"),
    ("FR", "CHATEL"):   (46.57,  3.73, "Châtelperron"),
    ("FR", "CHATELLE"): (46.82,  0.54, "Châtellerault"),
    ("FR", "CHATOU"):   (48.89,  2.15, "Chatou"),
    ("FR", "COGNAC"):   (45.69, -0.33, "Cognac"),
    ("FR", "COLOMBEL"): (49.30, -0.38, "Colombelles"),
    ("FR", "COLOMBES"): (48.92,  2.26, "Colombes"),
    ("FR", "COLOMIER"): (43.61,  1.34, "Colomiers"),
    ("FR", "COMMERCY"): (48.77,  5.58, "Commercy"),
    ("FR", "COMPIEGN"): (49.42,  2.83, "Compiègne"),
    ("FR", "CORMEIL"):  (49.04,  2.06, "Cormeilles-en-Vexin"),
    ("FR", "COURNEUV"): (48.93,  2.39, "La Courneuve"),
    ("FR", "CRETEIL"):  (48.79,  2.46, "Créteil"),
    ("FR", "CURRY"):    (48.90,  2.31, "Clichy"),  # per address
    ("FR", "DIJON"):    (47.32,  5.04, "Dijon"),
    ("FR", "DINARD"):   (48.63, -2.06, "Dinard"),
    ("FR", "EMPLASC"):  (45.45,  4.39, "Saint-Étienne"),
    ("FR", "ERAGNY"):   (49.02,  2.11, "Éragny"),
    ("FR", "EVRY"):     (48.63,  2.44, "Évry"),
    ("FR", "EVREUX"):   (49.02,  1.15, "Évreux"),
    ("FR", "FIGEAC"):   (44.61,  2.03, "Figeac"),
    ("FR", "FLORANGE"): (49.32,  6.14, "Florange"),
    ("FR", "FOUGERES"): (48.35, -1.20, "Fougères"),
    ("FR", "GENNEVIL"): (48.93,  2.30, "Gennevilliers"),
    ("FR", "GONFREVI"): (49.50,  0.23, "Gonfreville"),
    ("FR", "GRENOBLE"): (45.19,  5.72, "Grenoble"),
    ("FR", "ISSOUDUN"): (46.95,  1.99, "Issoudun"),
    ("FR", "ISSY"):     (48.82,  2.26, "Issy-les-Moulineaux"),
    ("FR", "LEHAILL"):  (44.87, -0.64, "Le Haillan"),
    ("FR", "LEHAILLA"): (44.87, -0.64, "Le Haillan"),
    ("FR", "LEHAVRE"):  (49.49,  0.11, "Le Havre"),
    ("FR", "LIEUSAIN"): (48.63,  2.55, "Lieusaint"),
    ("FR", "LIEUSAI2"): (48.63,  2.55, "Lieusaint"),
    ("FR", "LYON"):     (45.76,  4.83, "Lyon"),
    ("FR", "MANTES"):   (48.98,  1.72, "Mantes-la-Jolie"),
    ("FR", "MARIGNAN"): (43.42,  5.22, "Marignane"),
    ("FR", "MARMANDE"): (44.50,  0.17, "Marmande"),
    ("FR", "MASSY"):    (48.73,  2.27, "Massy"),
    ("FR", "MAUZAC"):   (43.33,  1.32, "Mauzac"),
    ("FR", "MELUN"):    (48.54,  2.66, "Melun"),
    ("FR", "MERIGNAC"): (44.84, -0.70, "Mérignac"),
    ("FR", "METZ"):     (49.12,  6.18, "Metz"),
    ("FR", "MEUDON"):   (48.81,  2.24, "Meudon"),
    ("FR", "MEZIERES"): (49.77,  4.72, "Charleville-Mézières"),
    ("FR", "MILLAU"):   (44.10,  3.08, "Millau"),
    ("FR", "MOISSY"):   (48.62,  2.59, "Moissy-Cramayel"),
    ("FR", "MOLSHEIM"): (48.54,  7.49, "Molsheim"),
    ("FR", "MONTLUC"):  (46.34,  2.60, "Montluçon"),
    ("FR", "MONTREAL"): (48.55,  4.47, "Brienne-le-Château"),
    ("FR", "NANTES"):   (47.22, -1.55, "Nantes"),
    ("FR", "NEUILLY"):  (48.88,  2.27, "Neuilly-sur-Seine"),
    ("FR", "NICE"):     (43.70,  7.27, "Nice"),
    ("FR", "NIMES"):    (43.84,  4.36, "Nîmes"),
    ("FR", "ORVAULT"):  (47.27, -1.63, "Orvault"),
    ("FR", "PAU"):      (43.30, -0.37, "Pau"),
    ("FR", "PARIS"):    (48.86,  2.35, "Paris"),
    ("FR", "PERROS"):   (48.81, -3.44, "Perros-Guirec"),
    ("FR", "POITIERS"): (46.58,  0.34, "Poitiers"),
    ("FR", "PTAUDEME"): (49.35,  0.51, "Pont-Audemer"),
    ("FR", "REIMS"):    (49.25,  4.03, "Reims"),
    ("FR", "RENNES"):   (48.12, -1.68, "Rennes"),
    ("FR", "ROANNE"):   (46.04,  4.07, "Roanne"),
    ("FR", "ROMORAN"):  (47.36,  1.74, "Romorantin"),
    ("FR", "ROUEN"):    (49.44,  1.10, "Rouen"),
    ("FR", "SARTROUV"): (48.93,  2.16, "Sartrouville"),
    ("FR", "SEMEAC"):   (43.23,  0.11, "Séméac"),
    ("FR", "SIVENS"):   (43.88,  1.89, "Sivens"),
    ("FR", "STCLOUD"):  (48.84,  2.22, "Saint-Cloud"),
    ("FR", "STDENIS"):  (48.94,  2.36, "Saint-Denis"),
    ("FR", "STETIENN"): (45.44,  4.39, "Saint-Étienne"),
    ("FR", "STMEDARD"): (44.89, -0.72, "Saint-Médard"),
    ("FR", "STNAZAIR"): (47.27, -2.21, "Saint-Nazaire"),
    ("FR", "SURESNES"): (48.87,  2.22, "Suresnes"),
    ("FR", "THIERS"):   (45.86,  3.55, "Thiers"),
    ("FR", "TOULON"):   (43.12,  5.93, "Toulon"),
    ("FR", "TOULOUSE"): (43.60,  1.44, "Toulouse"),
    ("FR", "TOURS"):    (47.39,  0.69, "Tours"),
    ("FR", "VALENCE"):  (44.93,  4.89, "Valence"),
    ("FR", "VERNON"):   (49.09,  1.48, "Vernon"),
    ("FR", "VERSAIL"):  (48.80,  2.13, "Versailles"),
    ("FR", "VICHY"):    (46.13,  3.42, "Vichy"),
    ("FR", "VILLAROC"): (48.61,  2.67, "Villaroche"),
    ("FR", "VILLARO"):  (48.61,  2.67, "Villaroche"),
    ("FR", "VILLEMUR"): (43.87,  1.50, "Villemur-sur-Tarn"),
    ("FR", "VITROLLE"): (43.46,  5.25, "Vitrolles"),

    # === UNITED STATES ===
    ("US", "ALEXANDR"): (38.80, -77.05, "Alexandria VA"),
    ("US", "ARLINGTO"): (38.88, -77.10, "Arlington VA"),
    ("US", "CALEXICO"): (32.68, -115.50, "Calexico CA"),
    ("US", "CARSON"):   (33.83, -118.28, "Carson CA"),
    ("US", "CINCINNA"): (39.10, -84.51, "Cincinnati OH"),
    ("US", "COLLEGEP"): (33.38, -84.45, "College Park GA"),
    ("US", "COSTAMES"): (33.64, -117.92, "Costa Mesa CA"),
    ("US", "DALLASGP"): (32.75, -96.99, "Dallas TX"),
    ("US", "DENTON"):   (33.22, -97.13, "Denton TX"),
    ("US", "EVERETT"):  (47.98, -122.20, "Everett WA"),
    ("US", "EVERSVS"):  (47.98, -122.20, "Everett WA"),
    ("US", "FOUNTAIN"): (33.67, -117.91, "Fountain Valley CA"),
    ("US", "FRTMYERS"): (26.64, -81.87, "Fort Myers FL"),
    ("US", "GAINESVI"): (33.60, -83.83, "Gainesville GA"),
    ("US", "GGROVELI"): (33.78, -118.00, "Garden Grove CA"),
    ("US", "GRANDPRA"): (32.74, -97.00, "Grand Prairie TX"),
    ("US", "INDIANAP"): (39.77, -86.16, "Indianapolis IN"),
    ("US", "IRVINE"):   (33.67, -117.82, "Irvine CA"),
    ("US", "LANCASTE"): (34.70, -118.14, "Lancaster CA"),
    ("US", "LIBERTYM"): (39.25, -94.42, "Liberty MO"),
    ("US", "MARYSVIL"): (48.05, -122.18, "Marysville WA"),
    ("US", "MENOMONE"): (44.88, -91.92, "Menomonie WI"),
    ("US", "MENTOR"):   (41.67, -81.34, "Mentor OH"),
    ("US", "MIRAMAR"):  (25.99, -80.23, "Miramar FL"),
    ("US", "MOBILE"):   (30.69, -88.04, "Mobile AL"),
    ("US", "NEWBRIGH"): (45.07, -93.21, "New Brighton MN"),
    ("US", "NEWPORT"):  (32.79, -79.94, "Newport NC"),
    ("US", "NORCROSS"): (33.94, -84.21, "Norcross GA"),
    ("US", "PEACHTRE"): (33.39, -84.60, "Peachtree City GA"),
    ("US", "PLAINFIE"): (39.70, -86.40, "Plainfield IN"),
    ("US", "REDMOND"):  (47.67, -122.12, "Redmond WA"),
    ("US", "ROCHESTE"): (43.16, -77.61, "Rochester NH"),
    ("US", "SANDIEGO"): (32.72, -117.16, "San Diego CA"),
    ("US", "SANTAANA"): (33.74, -117.86, "Santa Ana CA"),
    ("US", "SEATTLE"):  (47.61, -122.33, "Seattle WA"),
    ("US", "TWINSBUR"): (41.31, -81.44, "Twinsburg OH"),
    ("US", "WALTON"):   (38.89, -84.62, "Walton KY"),
    ("US", "WICHITA"):  (37.69, -97.34, "Wichita KS"),
    ("US", "YAKIMA"):   (46.60, -120.51, "Yakima WA"),

    # === MEXICO ===
    ("MX", "CHIHUA"):   (28.64, -106.09, "Chihuahua"),
    ("MX", "CHIHUAHU"): (28.64, -106.09, "Chihuahua"),
    ("MX", "CHIHUAP1"): (28.64, -106.09, "Chihuahua P1"),
    ("MX", "CHIHUAP2"): (28.64, -106.09, "Chihuahua P2"),
    ("MX", "EZAIR"):    (28.64, -106.09, "Chihuahua EZAir"),
    ("MX", "KAIZEN2"):  (20.80, -99.95, "Querétaro Kaizen"),
    ("MX", "MEXICALI"): (32.64, -115.47, "Mexicali"),
    ("MX", "QUERET"):   (20.59, -100.39, "Querétaro"),
    ("MX", "QUERETAR"): (20.59, -100.39, "Querétaro"),
    ("MX", "TIJUANA"):  (32.53, -117.02, "Tijuana"),

    # === UNITED KINGDOM ===
    ("GB", "BRACKLEY"): (52.03, -1.15, "Brackley"),
    ("GB", "BRAINTRE"): (51.88,  0.55, "Braintree"),
    ("GB", "BURNLEY"):  (53.79, -2.25, "Burnley"),
    ("GB", "CWMBRAN"):  (51.65, -3.02, "Cwmbran"),
    ("GB", "DERBY"):    (52.92, -1.48, "Derby"),
    ("GB", "FAREHAM"):  (50.85, -1.18, "Fareham"),
    ("GB", "GLOUCEST"): (51.86, -2.24, "Gloucester"),
    ("GB", "NEWPORT"):  (51.58, -2.99, "Newport"),
    ("GB", "PITSTONE"): (51.82, -0.65, "Pitstone"),
    ("GB", "SLOUGH"):   (51.51, -0.59, "Slough"),

    # === GERMANY ===
    ("DE", "BERGISCH"): (50.99,  7.13, "Bergisch Gladbach"),
    ("DE", "DAHLEWIT"): (52.34, 13.40, "Dahlewitz"),
    ("DE", "HAMBFANG"): (53.58,  9.89, "Hamburg-Fangdieck"),
    ("DE", "HAMBOURG"): (53.58,  9.89, "Hamburg"),
    ("DE", "HAMBURG"):  (53.70, 10.01, "Norderstedt"),
    ("DE", "HERBORN"):  (50.68,  8.30, "Herborn"),
    ("DE", "MUNICH"):   (48.14, 11.58, "Munich"),
    ("DE", "MURR"):     (48.96,  9.25, "Murr"),

    # === BELGIUM ===
    ("BE", "BRUXELLE"): (50.85,  4.36, "Brussels"),
    ("BE", "MARCHIN"):  (50.49,  5.32, "Marchin"),
    ("BE", "MILMORT"):  (50.68,  5.62, "Milmort"),
    ("BE", "STEENNOK"): (50.89,  4.48, "Steenokkerzeel"),
    ("BE", "ZAVENTEM"): (50.89,  4.48, "Zaventem"),

    # === SPAIN ===
    ("ES", "GETAFE"):   (40.31, -3.73, "Getafe"),
    ("ES", "VALLADOL"): (41.65, -4.72, "Valladolid"),

    # === NETHERLANDS ===
    ("NL", "ALKMAAR2"): (52.63,  4.75, "Alkmaar"),
    ("NL", "LELYSTAD"): (52.52,  5.47, "Lelystad"),

    # === SWITZERLAND ===
    ("CH", "HEERBRUG"): (47.41,  9.63, "Heerbrugg"),
    ("CH", "YVERDON"):  (46.78,  6.64, "Yverdon-les-Bains"),

    # === CZECH REP ===
    ("CZ", "PLZEN"):    (49.75, 13.38, "Plzeň"),

    # === POLAND ===
    ("PL", "HARTBEX"):  (50.04, 21.99, "Rzeszów"),
    ("PL", "ROPCZYCE"): (50.05, 21.61, "Ropczyce"),
    ("PL", "SEDZISZO"): (50.07, 21.70, "Sędziszów"),

    # === ROMANIA ===
    ("RO", "SCC"):      (47.17, 27.57, "Iași"),

    # === MOROCCO ===
    ("MA", "CASABLAN"): (33.57, -7.59, "Casablanca"),
    ("MA", "NOUACEUR"): (33.37, -7.59, "Nouaceur"),
    ("MA", "RABAT"):    (34.02, -6.83, "Rabat"),
    ("MA", "TEMARA"):   (33.93, -6.90, "Témara"),
    ("MA", "TIFFLET"):  (33.89, -6.31, "Tiflet"),

    # === TUNISIA ===
    ("TN", "GROMBALI"): (36.60, 10.50, "Grombalia"),
    ("TN", "SOLIDHAR"): (36.70, 10.49, "Soliman"),
    ("TN", "SOLIKORB"): (36.82, 10.57, "Korbous"),

    # === UAE ===
    ("AE", "ABUDHABI"): (24.48, 54.37, "Abu Dhabi"),
    ("AE", "DUBAI"):    (24.99, 55.18, "Dubai"),

    # === INDIA ===
    ("IN", "BANGALO"):  (12.97, 77.59, "Bengaluru"),
    ("IN", "BANGALOR"): (12.97, 77.59, "Bengaluru"),
    ("IN", "HOODI"):    (12.99, 77.72, "Hoodi Bangalore"),
    ("IN", "HYDERA"):   (17.38, 78.48, "Hyderabad"),
    ("IN", "KARNATAK"): (13.10, 77.59, "Yelahanka Bangalore"),
    ("IN", "KRPURAM"):  (12.99, 77.69, "KR Puram"),
    ("IN", "MUMBAI"):   (19.10, 72.87, "Mumbai"),
    ("IN", "NEWDEHLI"): (28.55, 77.10, "New Delhi"),

    # === SINGAPORE ===
    ("SG", "SINGAPO"):  (1.42, 103.88, "Singapore Seletar"),
    ("SG", "SINGAPOR"): (1.35, 103.98, "Singapore Changi"),

    # === MALAYSIA ===
    ("MY", "SEREMBAN"): (2.72, 101.94, "Sendayan"),

    # === THAILAND ===
    ("TH", "LAMPHUN"):  (18.57, 99.02, "Lamphun"),

    # === JAPAN ===
    ("JP", "TOKYO"):    (35.69, 139.76, "Tokyo"),

    # === KOREA ===
    ("KR", "SEOUL"):    (37.53, 126.99, "Seoul"),

    # === AUSTRALIA ===
    ("AU", "BOTANY"):   (-33.94, 151.20, "Botany NSW"),
    ("AU", "SYDNEY"):   (-33.92, 151.04, "Bankstown NSW"),

    # === BRAZIL ===
    ("BR", "OPTOVAC"):  (-23.20, -45.89, "São José dos Campos"),
    ("BR", "RIO"):      (-22.79, -43.33, "Rio de Janeiro"),
    ("BR", "SAOJOSE"):  (-23.21, -45.90, "São José dos Campos"),

    # === CANADA ===
    ("CA", "AJAX"):     (43.85, -79.03, "Ajax ON"),
    ("CA", "KIRKLAND"): (45.45, -73.87, "Kirkland QC"),
    ("CA", "LONDON"):   (42.98, -81.25, "London ON"),
    ("CA", "MIRABEL"):  (45.65, -74.04, "Mirabel QC"),
    ("CA", "MONTREAL"): (45.50, -73.57, "Montreal QC"),

    # === SOUTH AFRICA ===
    ("ZA", "VERULAM"):  (-29.65, 31.05, "Verulam"),

    # === SPECIAL — SUSA/group shared (BE) ===
    ("SA", "SAB"):      (50.63,  6.03, "Eupen"),      # Capaul/Middlegate
    ("SS", "SSA"):      (17.37, 78.48, "Hyderabad"),  # sub-SSA in India
}


OVERRIDES_CSV   = Path(__file__).resolve().parent / "geocode_overrides.csv"
SITES_GEO_CSV   = Path(__file__).resolve().parent / "sites_geo.csv"


# ============================================================================
# French department centroids — used when an address gives us a postal code
# but we don't have a precise city in the CITIES dict. Far better than the
# COUNTRY_CENTROID fallback which scatters all FR sites near "46.6, 2.4".
# Keys = first 2 digits of FR postal code.
# ============================================================================
FR_DEPARTMENTS = {
    "01": (46.20,  5.22), "02": (49.55,  3.55), "03": (46.40,  3.20), "04": (44.10,  6.30),
    "05": (44.65,  6.10), "06": (43.93,  7.08), "07": (44.75,  4.40), "08": (49.65,  4.70),
    "09": (42.95,  1.40), "10": (48.30,  4.10), "11": (43.20,  2.40), "12": (44.30,  2.55),
    "13": (43.50,  5.10), "14": (49.10, -0.40), "15": (45.05,  2.65), "16": (45.65,  0.15),
    "17": (45.75, -0.65), "18": (47.10,  2.40), "19": (45.30,  1.85), "20": (42.15,  9.00),
    "21": (47.30,  4.85), "22": (48.55, -2.85), "23": (46.10,  1.95), "24": (45.10,  0.70),
    "25": (47.20,  6.40), "26": (44.70,  5.10), "27": (49.10,  1.10), "28": (48.45,  1.50),
    "29": (48.30, -4.00), "30": (43.95,  4.20), "31": (43.50,  1.40), "32": (43.65,  0.65),
    "33": (44.80, -0.55), "34": (43.65,  3.60), "35": (48.10, -1.65), "36": (46.80,  1.55),
    "37": (47.30,  0.65), "38": (45.20,  5.65), "39": (46.65,  5.65), "40": (43.95, -0.85),
    "41": (47.55,  1.40), "42": (45.65,  4.30), "43": (45.10,  3.80), "44": (47.20, -1.55),
    "45": (47.85,  2.20), "46": (44.60,  1.55), "47": (44.30,  0.65), "48": (44.50,  3.50),
    "49": (47.45, -0.55), "50": (49.10, -1.30), "51": (49.05,  4.05), "52": (48.10,  5.20),
    "53": (48.10, -0.75), "54": (48.70,  6.20), "55": (48.95,  5.45), "56": (47.75, -2.85),
    "57": (49.10,  6.65), "58": (47.10,  3.50), "59": (50.50,  3.20), "60": (49.40,  2.40),
    "61": (48.55,  0.10), "62": (50.50,  2.30), "63": (45.75,  3.15), "64": (43.30, -0.65),
    "65": (43.10,  0.10), "66": (42.65,  2.85), "67": (48.55,  7.65), "68": (47.75,  7.30),
    "69": (45.75,  4.85), "70": (47.65,  6.10), "71": (46.65,  4.55), "72": (48.00,  0.20),
    "73": (45.55,  6.40), "74": (46.05,  6.65), "75": (48.85,  2.35), "76": (49.55,  1.10),
    "77": (48.55,  3.05), "78": (48.85,  1.95), "79": (46.30, -0.30), "80": (49.90,  2.30),
    "81": (43.85,  2.10), "82": (44.05,  1.30), "83": (43.55,  6.25), "84": (44.00,  5.10),
    "85": (46.65, -1.40), "86": (46.55,  0.45), "87": (45.85,  1.25), "88": (48.20,  6.45),
    "89": (47.85,  3.55), "90": (47.65,  6.85), "91": (48.55,  2.35), "92": (48.85,  2.25),
    "93": (48.95,  2.45), "94": (48.80,  2.45), "95": (49.05,  2.10),
}


def _parse_address(address: str, cc: str | None):
    """Extract (postal_code, city) from a postal address string.

    Returns (pc, city) where each can be None. Handles common patterns:
      - FR: "<street>, 12345 CITY[,/ FRANCE]" or "12 345 CITY"
      - DE: "<street>, 12345 City" (5-digit postal code, same shape as FR)
      - GB: "<street>, City PostalCode" (2-letter + digits)
      - Generic fallback: any 4-7 digit number followed by a city-like token
    """
    if not address:
        return None, None
    s = re.sub(r"\s+", " ", address.replace("\n", " ").strip())

    # FR / DE / similar: "<digits> <CITY>"
    if cc in ("FR", "DE", "BE", "ES", "IT", "PL", "RO", "CH", "AT", "NL", "CZ"):
        # Allow "12 345 CITY" (FR with space) or "12345 CITY"
        m = re.search(r"(\d{2})\s*(\d{3})\s+([A-Za-zÀ-ÿ][^,/\d]+?)(?:[,/]|\sFRANCE\b|$)", s, re.IGNORECASE)
        if m:
            pc = m.group(1) + m.group(2)
            city = m.group(3).strip().rstrip("/-").strip()
            # Clean trailing words like "Cedex"
            city = re.sub(r"\s+CEDEX\b.*$", "", city, flags=re.IGNORECASE).strip()
            return pc, city

    # GB-style: "City SW1A 1AA"
    if cc == "GB":
        m = re.search(r"([A-Za-z][A-Za-z\s\-']{2,30}?)\s+([A-Z]{1,2}\d{1,2}[A-Z]?\s+\d[A-Z]{2})", s)
        if m:
            return m.group(2), m.group(1).strip()

    # Generic: postal code (3-6 digits) + city
    m = re.search(r"(\d{3,6})\s+([A-Za-zÀ-ÿ][^,/\d]{2,})(?:[,/]|$)", s)
    if m:
        return m.group(1), m.group(2).strip()
    return None, None


def _load_overrides():
    """Load per-site overrides.

    Preferred source: `sites_geo.csv` (10 cols: site_id + auto_* + override_*).
      Each override_* column, if non-empty, replaces the corresponding auto_*
      value. Granularity is per-field — you can override only the city name and
      keep the auto coords, etc. A row produces an override entry only if at
      least one override_* column is filled.

    Legacy source: `geocode_overrides.csv` (5 cols: site_id, lat, lon, label,
      country_code) — read only if sites_geo.csv is missing.
    """
    out = {}

    # --- 1. Preferred: sites_geo.csv ---
    if SITES_GEO_CSV.exists():
        try:
            with SITES_GEO_CSV.open(newline="", encoding="utf-8-sig") as f:
                for row in csv.DictReader(f):
                    sid = (row.get("site_id") or "").strip()
                    if not sid or sid.startswith("#"):
                        continue
                    ov_label = (row.get("override_city")    or "").strip()
                    ov_lat   = (row.get("override_lat")     or "").strip()
                    ov_lon   = (row.get("override_lon")     or "").strip()
                    ov_cc    = (row.get("override_country") or "").strip().upper()
                    if not (ov_label or ov_lat or ov_lon or ov_cc):
                        continue
                    # Per-field fallback to auto_* when the override is blank
                    try:
                        lat = float(ov_lat) if ov_lat else float(row.get("auto_lat") or "0")
                        lon = float(ov_lon) if ov_lon else float(row.get("auto_lon") or "0")
                    except ValueError:
                        continue
                    label = ov_label or (row.get("auto_city") or sid)
                    cc    = ov_cc or (row.get("auto_country") or "").strip().upper() or None
                    out[sid] = (lat, lon, label, cc)
        except Exception as e:
            print(f"  ! sites_geo.csv ignored ({e})")
        return out

    # --- 2. Legacy fallback: geocode_overrides.csv ---
    if OVERRIDES_CSV.exists():
        try:
            with OVERRIDES_CSV.open(newline="", encoding="utf-8-sig") as f:
                for row in csv.DictReader(f):
                    sid = (row.get("site_id") or "").strip()
                    if not sid or sid.startswith("#"):
                        continue
                    try:
                        lat = float(row["lat"])
                        lon = float(row["lon"])
                    except (KeyError, ValueError, TypeError):
                        continue
                    label = (row.get("label") or "").strip() or sid
                    cc = (row.get("country_code") or "").strip().upper() or None
                    out[sid] = (lat, lon, label, cc)
        except Exception as e:
            print(f"  ! geocode_overrides.csv ignored ({e})")
    return out


OVERRIDES = _load_overrides()


def _norm_key(location):
    """Upper-case, alnum only, first 8 chars."""
    s = re.sub(r"[^A-Za-z0-9]", "", str(location or "")).upper()[:8]
    return s


def _hash_offset(site_id, amplitude=1.6):
    """Deterministic pseudo-random offset in [-amp, amp] for dispersion."""
    h = hashlib.md5(str(site_id).encode()).digest()
    dx = (h[0] / 255.0 - 0.5) * 2 * amplitude
    dy = (h[1] / 255.0 - 0.5) * 2 * amplitude
    return dx, dy


def geocode_site(site_id, address=None):
    """
    Returns (lat, lon, label, country_code, resolution)
    resolution ∈ {"override", "city", "address", "country_fallback", "unknown"}

    `address`, when provided, is the postal address of the site. It is parsed
    to extract postal code + city, and used to resolve precise coordinates
    when the site_id-suffix lookup misses.
    """
    if not site_id:
        return (0.0, 0.0, "Unknown", None, "unknown")

    # 1. Check user overrides first
    sid = str(site_id)
    if sid in OVERRIDES:
        lat, lon, label, cc = OVERRIDES[sid]
        return (lat, lon, label, cc, "override")

    parts = sid.split("-")
    cc_match = re.match(r"^([A-Z]{2})", parts[0]) if parts else None
    cc = cc_match.group(1) if cc_match else None

    if len(parts) >= 4:
        location_raw = "-".join(parts[3:])
    else:
        location_raw = site_id

    loc_key = _norm_key(location_raw)

    if cc not in COUNTRY_CENTROID:
        cc = None

    # 2. Try precise CITIES match on the suffix
    if cc and (cc, loc_key) in CITIES:
        lat, lon, label = CITIES[(cc, loc_key)]
        return (lat, lon, label, cc, "city")

    # 3. Partial CITIES match (prefix) on the suffix
    if cc:
        for (c, k), (lat, lon, label) in CITIES.items():
            if c != cc:
                continue
            if k.startswith(loc_key[:5]) or loc_key.startswith(k[:5]):
                return (lat, lon, label, cc, "city")

    # 4. Address-based resolution: parse the postal address.
    if address and cc:
        pc, city = _parse_address(address, cc)
        if city:
            # 4a. Try the parsed city against CITIES (full + prefix match)
            city_key = _norm_key(city)
            if (cc, city_key) in CITIES:
                lat, lon, label = CITIES[(cc, city_key)]
                return (lat, lon, label, cc, "address")
            for (c, k), (lat, lon, label) in CITIES.items():
                if c != cc:
                    continue
                if k.startswith(city_key[:5]) or city_key.startswith(k[:5]):
                    return (lat, lon, label, cc, "address")
            # 4b. FR fallback: postal code → department centroid
            if cc == "FR" and pc and pc[:2] in FR_DEPARTMENTS:
                lat, lon = FR_DEPARTMENTS[pc[:2]]
                return (lat, lon, city.title(), cc, "address")
            # 4c. Other country with extracted city: use city name as label,
            #     and country centroid as coords (no precise lookup available)
            if cc in COUNTRY_CENTROID:
                base_lat, base_lon, _ = COUNTRY_CENTROID[cc]
                dx, dy = _hash_offset(site_id, amplitude=0.6)
                return (base_lat + dy, base_lon + dx, city.title(), cc, "address")

    # Country fallback with deterministic offset
    if cc and cc in COUNTRY_CENTROID:
        base_lat, base_lon, country_label = COUNTRY_CENTROID[cc]
        dx, dy = _hash_offset(site_id)
        return (base_lat + dy, base_lon + dx, country_label, cc, "country_fallback")

    return (0.0, 0.0, "Unknown", None, "unknown")


COUNTRY_NAMES = {cc: v[2] for cc, v in COUNTRY_CENTROID.items()}


if __name__ == "__main__":
    # Smoke test — uses generic site_id shapes (CC<digits>-<batch>-<BU>-<location>)
    for sid in ["FR001-1-XXX-PARIS", "GB002-1-XXX-LONDON", "US003-1-XXX-NEWYORK"]:
        print(sid, "→", geocode_site(sid))
