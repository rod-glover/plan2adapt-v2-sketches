// This module is a short-term replacement for receiving this data from the
// backend. The basis is the contents of a CSV file that holds the rulebase.
// Here, we process that CSV file into something usable for this application.
// Some or all of this may be able to be eliminated depending on what the
// backend returns for the rulebase.

import flow from 'lodash/fp/flow';
import map from 'lodash/fp/map';
import zipObject from 'lodash/fp/zipObject';
import split from 'lodash/fp/split';
import replace from 'lodash/fp/replace';

const rawCsv =
`"snow";"(temp_djf_iamean_s0p_hist <= -6)";;;"Internal rule";"Hamlet et al. (2007) broadly characterized snowmelt dominant basins as those with DJF below -6&deg;C, hybrid basins as those with DJF between -6&deg;C and 5&deg;C, and rain dominant basins those with a DJF exceeding 5&deg;C. Snow dominated basins are defined for this purpose as basins where the spatial median of temperature is less than or equal to -6&deg;C.";"internal snow rule"
"hybrid";"((temp_djf_iamean_s0p_hist <= -6) && (temp_djf_iamean_s100p_hist >= -6)) || ((temp_djf_iamean_s0p_hist <= 5) && (temp_djf_iamean_s100p_hist >= 5)) || ((temp_djf_iamean_s0p_hist >= -6) && (temp_djf_iamean_s100p_hist <= 5))";;;"Internal rule";"Hybrid basins are basins which spatially vary sufficiently that they include temperature values between -6&deg;C and +5&deg;C.";"internal Hybrid rule"
"rain";"(temp_djf_iamean_s100p_hist >= 5)";;;"Internal rule";"Rain-dominated basins are defined as basins where the spatial median temperature is greater than +5&deg;C; as per Hamlet et al.";"internal Rain rule"
"future-snow";"(temp_djf_iamean_s0p_hist + temp_djf_iamean_s0p_e25p <= -6)";;;"Internal rule";"Internal rule";"internal future Snow rule"
"future-hybrid";"((temp_djf_iamean_s0p_hist + temp_djf_iamean_s0p_e25p <= -6) && (temp_djf_iamean_s100p_hist + temp_djf_iamean_s100p_e75p >= -6)) || ((temp_djf_iamean_s0p_hist + temp_djf_iamean_s0p_e25p <= 5) && (temp_djf_iamean_s100p_hist + temp_djf_iamean_s100p_e75p >= 5)) || ((temp_djf_iamean_s0p_hist + temp_djf_iamean_s0p_e75p >= -6) && (temp_djf_iamean_s100p_hist + temp_djf_iamean_s100p_e25p <= 5))";;;"Internal rule";"Internal rule";"internal Hybrid rule"
"future-rain";"(temp_djf_iamean_s100p_hist + temp_djf_iamean_s100p_e75p >= 5)";;;"Internal rule";"Internal rule";"internal Rain rule"
"shm";"(temp_jul_iamean_smean_hist / ((prec_jja_iamean_smean_hist / 1000) * 92))";;;"Internal rule";"The Summer Heat-to-Moisture index, or SH:M, is an index that defines roughly how dry conditions are. Higher numbers indicate drier conditions.";"internal summer heat:moisture rule"
"1a-i-hydro";"((((prec_djf_iamean_smean_e75p / 100) * prec_djf_iamean_smean_hist) > 0.75 * prec_djf_iastddev_smean_hist) || (((prec_mam_iamean_smean_e75p / 100) * prec_mam_iamean_smean_hist) > 0.75 * prec_mam_iastddev_smean_hist) || (((prec_jja_iamean_smean_e75p / 100) * prec_jja_iamean_smean_hist) > 0.75 * prec_jja_iastddev_smean_hist) || (((prec_son_iamean_smean_e75p / 100) * prec_son_iamean_smean_hist) > 0.75 * prec_son_iastddev_smean_hist))";"Possible Flooding";"Hydrology";"Higher intensity and/or frequency of seasonal precipitation";"If high intensity rainfall has been an issue already, then:<ul><li>Stormwater design standard may no longer be adequate for new construction.</li><li>Existing drainage infrastructure may need capacity increases or augmenting with retention ponds.</li><li>Seasonal water quality may be reduced due to higher sediment load where intense precipitation causes increased soil erosion.</li><li>Combined sewer overflows may become more frequent.</li><li>Stream bank erosion may increase.</li></ul>";
"1a-ii-infra";"((rule_future-hybrid || rule_future-rain) && ((prec_djf_iamean_smean_e75p / 100) * prec_djf_iamean_smean_hist) > 0.75 * prec_djf_iastddev_smean_hist) || (((prec_mam_iamean_smean_e75p / 100) * prec_mam_iamean_smean_hist) > 0.75 * prec_mam_iastddev_smean_hist) || (((prec_jja_iamean_smean_e75p / 100) * prec_jja_iamean_smean_hist) > 0.75 * prec_jja_iastddev_smean_hist) || (((prec_son_iamean_smean_e75p / 100) * prec_son_iamean_smean_hist) > 0.75 * prec_son_iastddev_smean_hist)";"High Intensity Precipitation";"Infrastructure";"Higher intensity and/or frequency of rainfall events";"<ul><li>Drainage appliances' design capacity may be exceeded.</li><li>Road safety may be reduced due to increased ponding and hydroplaning.</li><li>Road crest design may require modification to shed water more quickly.</li><li>Increased risk of flooding.</li><li>Mud, debris, or earth flow frequency may increase.</li></ul>";"same as 1a-i-hydro but only djf if not a snow basin."
"1a-iii-infra";"rule_1a-i-hydro ";"High Intensity Precipitation";"Infrastructure";"Increased debris flow risk";"<ul><li>Higher frequency of intense rainfall events increases the risk of mud/debris/earth flows.</li></ul>";"Quit renaming shit, Trevor"
"1a-iv-infra";"rule_1a-i-hydro";"High Intensity Precipitation";"Infrastructure";"Possible increased incidence of flooding";"<ul><li>Increased precipitation may place additional strain on storm water drainage systems.<ul><li>Assess storm water drainage systems.</li><li>Consider impact of Total Impervious Area (TIA) on storm drainage load.</li><li>Assess need for dikes and stormwater retention ponds.</li><li>Re-examine landscape and other development guidelines.</li><li>Assess agricultural drainage network.</li></ul></li></ul>";
"1a-v-bio";"((prec_son_iamean_smean_e25p > 0) || (prec_djf_iamean_smean_e25p > 0) || (prec_mam_iamean_smean_e25p > 0) || (prec_jja_iamean_smean_e25p > 0))";"High Intensity Precipitation";"Biodiversity";"Seasonal moisture availability increases";"<ul><li>Consider effects of increased precipitation intensity and seasonal moisture availability on habitat.</li></ul>";
"1a-vi-ag";"((((prec_mam_iamean_smean_e75p / 100) * prec_mam_iamean_smean_hist) > 0.75 * prec_mam_iastddev_smean_hist) || (((prec_jja_iamean_smean_e75p / 100) * prec_jja_iamean_smean_hist) > 0.75 * prec_jja_iastddev_smean_hist) || (((prec_son_iamean_smean_e75p / 100) * prec_son_iamean_smean_hist) > 0.75 * prec_son_iastddev_smean_hist))";"High Intensity Precipitation";"Agriculture";"Extreme rainfall events may increase in frequency";"<ul><li>Soil erosion may increase.</li><li>Crops may be damaged.</li><li>Soil erosion may increase.</li><li>Crops may be damaged.</li><li>Pollination and planting may be disrupted.</li><li>Harvesting may be disrupted or prevented.</li><li>Nutrient and input (fertilizer, agricultural chemicals) leaching may increase.</li></ul>";
"1b-i-hydro";"(!rule_future-snow && prec_djf_iamean_smean_e25p > 0) || (prec_son_iamean_smean_e25p > 0) || (prec_mam_iamean_smean_e25p > 0)";"Possible Flooding";"Hydrology";"Increased runoff and potential flooding";"<ul><li>Flooding may increase in frequency and magnitude where flooding is already an issue.</li><li>Seasonal water quality may be reduced.</li><li>Stream bank erosion may increase.</li></ul>";
"1b-ii-ag";"rule_1a-i-hydro";"Possible Flooding";"Agriculture";"Increase in extreme rainfall events";"<ul><li>Increased variability in rainfall may cause changes in flood regimes not anticipated in current emergency management plans.</li><li>Flooding may have agricultural impacts not considered in flood management response plan.</li><li>Examine options for crop production on frequently flooded land.</li></ul>";
"1b-iii-fish";"(( rule_snow || rule_hybrid ) && (pass_djf_iamean_smean_e25p > 0))";"Possible Flooding";"Fisheries";"Possible increase in flow barrier for returning salmon";"Possible increase in incidence of:<ul><li>Spawning failure.</li><li>Forgone harvest.</li><li>Fisheries closures.</li><li>Conflicts among users.</li><li>Species at risk concerns.</li><li>Jurisdictional issues in management response.</li></ul>";
"1b-iv-fish";"(( rule_snow || rule_hybrid ) && (pass_djf_iamean_smean_e25p > 0) && (temp_mam_iamean_smean_e25p > 0 ))";"Possible Flooding";"Fisheries";"Potentially damaging high river flows";"Possible washout of spawning habitat:<ul><li>Habitat damage &mdash; loss of spawning habitat and stream bottom changes.</li><li>Redistribution of woody debris.</li></ul>";
"1b-v-infra";"(rule_1b-i-hydro && (region_oncoast == 1))";"Possible Flooding";"Infrastructure";"Increased runoff and potential flooding";"<ul><li>Assess flood risks in coastal and delta areas from sea level rise and increased river flows.</li></ul>";
"1b-vi-infra";"rule_1b-i-hydro";"Possible Flooding";"Infrastructure";"Increased runoff and potential flooding";"<ul><li>More frequent, higher river flows may cause increased strain on dikes and other flood protection infrastructure.<ul><li>Existing drainage infrastructure may need capacity increases or augmenting with retention ponds.</li><li>Erosion may increase; consider impacts on property and habitat.</li><li>Consider managed retreat and abandonment of frequently flooded land.</li></ul></li><li>Stormwater design standard may no longer be adequate.<ul><li>Combined sewer overflows may become more frequent.</li><li>Natural area parks with streams &amp; creeks may flood requiring greater local budget to manage storm water.</li></ul></li><li>Identify key community assets, e.g hospitals and schools that could be vulnerable to flooding.<ul><li>Increased sediment accumulation may occur in stream and river beds which reduces channel capacity and can result in impacts on bridge stability.</li></ul></li><li>Seasonal water quality may be reduced.</li><li>Recreational services may be reduced due to field closures.</li></ul>";
"1b-vii-infra";"rule_1b-iv-fish";"Possible Flooding";"Infrastructure";"Potentially damaging high river flows";"<ul><li>Increased sediment accumulation in stream and river beds may occur.</li><li>Erosion may increase; consider impacts on fish habitat.</li></ul>";
"1c-i-ag";"(((prec_son_iamean_smean_e25p > 0) && (prec_mam_iamean_smean_e25p > 0)) || rule_1a-i-hydro)";"Waterlogged Soil";"Agriculture";"Possible increase in waterlogged soil";"<ul><li>Excess water on farmland may need improved management. Regional infrastructure, ditch, and drainage coordination may be required to allow on-farm drainage to work.</li></ul>";
"1c-i-ag-1";"((prec_mam_iamean_smean_e25p > 0) || ((prec_mam_iamean_smean_e75p / 100) * prec_mam_iamean_smean_hist > 0.75 * prec_mam_iastddev_smean_hist))";"Waterlogged Soil";"Agriculture";"Possible increase in waterlogged soil";"<ul><li>Planting schedules or techniques may need to be adjusted.</li><li>Pollination success may be negatively affected.</li></ul>";
"1c-i-ag-2";"((prec_son_iamean_smean_e25p > 0) || ((prec_son_iamean_smean_e75p / 100) * prec_son_iamean_smean_hist > 0.75 * prec_son_iastddev_smean_hist))";"Waterlogged Soil";"Agriculture";"Possible increase in waterlogged soil";"<ul><li>Harvesting may be delayed or interrupted. Consider changes to equipment or harvesting techniques.</li></ul>";
"1c-ii-land";"rule_1c-i-ag";"Waterlogged Soil";"Planning and Land Use";"Possible increase in waterlogged soil";"<ul><li>Water quality may be negatively affected by nutrient and input (fertilizer, agricultural chemical) runoff.</li><li>Excess water will require coordination between regional ditch, drainage and diking system.</li><li>Steep slopes may be destabilized by additional water load.<ul><li>Assess local land use, steep slope soil composition, and slope hazards.</li><li>Consider additional local studies and geotechnical analysis.</li><li>Consider a risk assessment to understand liability (e.g. slope failure, falling trees) for local government.</li></ul></li></ul>";
"1d-i-infra";"rule_1a-i-hydro && (region_oncoast == 1)";"Sea Level Rise / Storm Surge";"Infrastructure";"Sea level rise and possible increase in storm surges";"<ul><li>Assess flood risks in coastal and delta areas from sea level rise and increased high intensity precipitation and storm surge.</li></ul>";
"1d-ii-land";"region_oncoast == 1";"Sea Level Rise / Storm Surge";"Planning and Land Use";"Sea level rise and possible increase in storm surges";"<ul><li>May require new design guidelines for Flood Control Levels (FCLs) and infrastructure.</li><li>Increased communication &amp; collaboration between Engineering and Planning departments.</li></ul>";
"1d-iii-ag";"rule_1d-ii-land";"Sea Level Rise / Storm Surge";"Agriculture";"Sea level rise and possible increase in storm surges";"<ul><li>Farmland in coastal and delta areas may be affected by soil salination or inundation.</li><li>Water sources for irrigation may become salinated.</li></ul>";
"2a-i-hydro";"(rule_future-rain && (prec_jja_iamean_smean_e75p < 0)) || ((rule_future-snow || rule_future-hybrid) && (prec_ann_iamean_smean_e75p < 0) && ((temp_mam_iamean_smean_e25p > 0) || (temp_djf_iamean_smean_e25p > 0)))";"Reduced Water Supply";"Hydrology";"Possible reduced summer stream flow and lower ground water table";"<ul><li>Lower ground water tables and reduced summer streamflow will reduce available potable water.<ul><li>Consider concerns for meeting local water demand.</li><li>May need to assess and increase water storage capacity.</li></ul></li><li>Streamflow may be decreased in June, July, August, and/or September.</li><li>Low flow periods may increase in length.</li></ul>";
"2a-ii-hydro";"rule_future-rain && (prec_jja_iamean_smean_e75p < 0) && (temp_jja_iamean_smean_e25p > 0)";"Reduced Water Supply";"Hydrology";"Increased possibility of drought";"<ul><li>Consider vulnerability of agriculture, water supply, and natural areas to drought.</li></ul>";
"2a-iii-bio";"rule_2a-i-hydro || rule_2a-ii-hydro";"Reduced Water Supply";"Biodiversity";"Increased possibility of drought or increased salinity of wetlands";"<ul><li>Groundwater quality may be affected by an increase in droughts and wetland salinization.</li><li>Possible loss of ecosystem goods and services in terms of the provision of drainage cooling, recreation and water supply.</li></ul>";
"2a-iv-bio";"((prec_son_iamean_smean_e75p < 0) || (prec_djf_iamean_smean_e75p < 0) || (prec_mam_iamean_smean_e75p < 0) || (prec_jja_iamean_smean_e75p < 0))";"Reduced Water Supply";"Biodiversity";"Seasonal moisture availability decreases";"<ul><li>Habitat may be affected by decreases in moisture availability in one or more seasons.<ul><li>Evaluate winter/spring runoff with respect to irrigation policies, water storage requirements, and conservation programs.</li></ul></li></ul>";
"2a-v-ag";"rule_2a-iv-bio";"Reduced Water Supply";"Agriculture";"Seasonal moisture availability decreases";"<ul><li>Soil moisture may decrease in one or more seasons.<ul><li>Consider options for managing soil moisture and improvements in irrigation infrastructure.</li></ul></li></ul>";
"2a-vi-ag";"rule_2a-iii-bio";"Reduced Water Supply";"Agriculture";"Increased possibility of drought or increased salinity of wetlands";"<ul><li>Livestock may be affected by reduced water quality in standing water sources.</li></ul>";
"2a-vii-land";"rule_2a-iii-bio";"Reduced Water Supply";"Planning and Land Use";"Increased possibility of drought";"<ul><li>Drought conditions will increase demands on water storage reservoirs.<ul><li>Consider increase in water conservation, demand management, and watering restrictions.</li><li>Consider water metering to evaluate consumption levels.</li></ul></li><li>Drought management plans as defined by the Water Act modernization project will need to be developed or reviewed.</li><li>Water conservation &amp; water restrictions may require changes in landscape development guidelines.<ul><li>Plan for compact complete communities and adaptive urban design to mitigate the urban heat island effect.</li></ul></li><li>Fire suppression planning should be undertaken.</li></ul>";
"2b-i-hydro";"(rule_snow || rule_hybrid) && (temp_mam_iamean_smean_e25p > 0)";"Longer Dry Season";"Hydrology";"Earlier freshet and extended dry season";"<a target=""_new"" href=""http://pacificclimate.org/sites/default/files/publications/Schnorbus.HydroModelling.FinalReport2.Apr2011.pdf"">Advance of freshet</a>:<ul><li>Dry period may be longer.</li><li>Water supply may be reduced.</li><li>Storage reservoir demand may be increased.</li><li>Water use restrictions may need to be tightened.</li></ul>";
"2b-ii-for";"temp_mam_iamean_smean_e25p > 0 && temp_jja_iamean_smean_e25p > 0 && temp_son_iamean_smean_e25p > 0 && (prec_mam_iamean_smean_e75p < 0 || prec_jja_iamean_smean_e75p < 0 || prec_son_iamean_smean_e75p < 0)";"Longer Dry Season";"Forestry";"Possible increase in fire season length";"<ul><li>Forest fire severity may increase.<ul><li>Evaluate staffing and distribution of forest protection staff and resources.</li></ul></li></ul>";
"3a-i-for";"(rule_snow || rule_hybrid) && (temp_djf_iamean_smean_e25p > 0)";"Increase in Temperature";"Forestry";"Shorter access season where winter access requires frozen roads";"<ul><li>Winter logging season will likely decrease in length.<ul><li>Greater stockpiles of logs may be needed to keep mills working during freeze-up and break-up.</li></ul></li></ul>";
"3a-ii-for";"nffd_jja_iamean_smean_e25p > 0";"Increase in Temperature";"Forestry";"Opportunities for facilitated migration of tree species";"<ul><li>Increases in growing season lengths and changes in frost dates may make southerly temperate species more suitable; assess suitability in the local context.<ul><li>Interior Douglas Fir, Western Larch and some southerly temperate species may be good candidates for facilitated migration upslope and northward.</li></ul></li></ul>";
"3a-iii-ag";"(nffd_ann_iamean_smean_e25p >= 0) && (dl18_djf_iamean_smean_e75p < 0)";"Increase in Temperature";"Agriculture";"Warmer and shorter cold season";"<ul><li>Potential growing and production seasons for certain commodities may be increased in length.</li><li>Heating costs in the cold season may be reduced.</li></ul>";
"3a-iv-fish";"rule_snow && (temp_mam_iamean_smean_e25p > 0)";"Increase in Temperature";"Fisheries";"Earlier spring lake ice melt";"<ul><li>Lake productivity may decline.</li><li>Inland fisheries, sport fishing, and related tourism may be affected.</li><li>Salmon (juvenile) smolt migration timing may be affected.</li></ul>";
"3a-v-infra";"(temp_djf_iastddev_smean_hist + temp_djf_iamean_smean_hist < 0) && (temp_djf_iamean_smean_e25p > 0)";"Increase in Temperature";"Infrastructure";"Decrease in frost penetration";"<ul><li>Utilities and foundations might not need to be as deep.</li><li>Frost heaving on roads may be reduced.<ul><li>Consider implications for road maintenance program.</li><li>Consider further investigation of daily minimum temperatures.</li></ul></li></ul>";
"3b-i-bio";"(temp_djf_iamean_smean_e25p > temp_djf_iastddev_smean_hist) || (temp_jja_iamean_smean_e25p > temp_jja_iastddev_smean_hist)";"Considerable Increase in Temperature";"Biodiversity";"Projected summer or winter temperature change is larger than the standard deviation of historical interannual variability";"<ul><li>Possible changes in:<ul><li>Biological productivity.</li><li>Timing and range of winter migration patterns.</li><li>Species behaviour.</li><li>Amount and timing of use of different parts of species' range (eg summer vs. winter areas).</li><li>Populations of pollinators, causing a ripple effect on biodiversity and agriculture.</li><li>Plant and animal patterns, such as flowering, breeding, mating, and migrating.</li></ul></li><li>Species interactions may be disrupted.</li><li>Impact of invasion by exotic species may increase.</li><li>Species extinction, extirpation, and/or hyperabundance may occur.</li><li>Incidence of human/wildlife conflict may increase.</li><li>Migration of some species may cease.</li><li>More generalist species may be favoured, causing a decrease in biodiversity.</li></ul>";"Comparing ratio to 1 is same as inequality involving the two things you're dividing."
"3b-ii-ag";"temp_jja_iamean_smean_e25p > temp_jja_iastddev_smean_hist";"Considerable Increase in Temperature";"Agriculture";"Increase in frequency of occurrence of high temperatures";"<ul><li>Extreme heat and humidity can pose challenges to existing agricultural and animal husbandry practices and infrastructure.<ul><li>Consider adjusting practices or technologies and changing crops.</li></ul></li><li>Ventilation costs or required management intensity for dairy, poultry, and greenhouse production may increase.</li></ul>";
"3b-iii-infra";"rule_3b-ii-ag";"Considerable Increase in Temperature";"Infrastructure";"Transportation and other temperature-sensitive infrastructure components could be adversely affected";"<ul><li>Road maintenance and rehabilitation programs may require changes.</li><li>Design parameters for new infrastructure may need to be changed.</li><li>See the <a href=""http://pievc.ca/"">PIEVC website</a> for case studies.</li></ul>";
"3b-iv-land";"rule_3b-ii-ag";"Considerable Increase in Temperature";"Planning and Land Use";"Possible increase in heat-related health impacts";"<ul><li>Health impacts from lower air quality may increase where low air quality is already a problem.</li><li>Public heat stress, heat exhaustinon, and heat stroke may strain medical facilities and require cooling centres.</li><li>Urban planning responses to mitigate the heat island effect in cities should be considered.</li></ul>";
"3c-i-hydro";"(rule_future-rain && !rule_rain) || (rule_rain && rule_snow && temp_djf_iamean_smean_e25p > 0)";"Shift in Hydrologic Regime Classification";"Hydrology";"Possible transition to rainfall dominant watersheds within region";"<ul><li>Late spring and/or summer flows may decrease, causing water storage issues:<ul><li>Loss of recreational use in reservoirs and lakes.</li><li>Increased need for conservation programs.</li><li>Increased need for seasonal storage.</li></ul></li></ul>";"Modified from original rule."
"3c-ii-hydro";"(rule_snow && !rule_future-snow) || (rule_rain && rule_snow && temp_djf_iamean_smean_e25p > 0)";"Shift in Hydrologic Regime Classification";"Hydrology";"Possible loss of snow melt dominant watersheds within region";"<ul><li>Potential decline in late spring / summer flows imply possible water storage issues:<ul><li>Loss of recreational use in reservoirs and lakes.</li><li>Increased need for conservation programs.</li><li>Increased need for seasonal storage.</li><li>Tourism economy may be affected if recreation use and/or sport fisheries are disrupted.</li></ul></li></ul>";"Modified from original rule."
"3d-i-infra";"((temp_son_iamean_smean_hist + temp_son_iastddev_smean_hist) < 0) && ((temp_son_iamean_smean_hist + temp_son_iamean_smean_e75p + temp_son_iastddev_smean_hist) > 0) && ((temp_son_iamean_smean_hist + temp_son_iamean_smean_e25p - temp_son_iastddev_smean_hist) < 0) || ((temp_djf_iamean_smean_hist + temp_djf_iastddev_smean_hist) < 0) && ((temp_djf_iamean_smean_hist + temp_djf_iamean_smean_e75p + temp_djf_iastddev_smean_hist) > 0) && ((temp_djf_iamean_smean_hist + temp_djf_iamean_smean_e25p - temp_djf_iastddev_smean_hist) < 0) || ((temp_mam_iamean_smean_hist + temp_mam_iastddev_smean_hist) < 0) && ((temp_mam_iamean_smean_hist + temp_mam_iamean_smean_e75p + temp_mam_iastddev_smean_hist) > 0) && ((temp_mam_iamean_smean_hist + temp_mam_iamean_smean_e25p - temp_mam_iastddev_smean_hist) < 0)";"Increase in Freeze/Thaw Cycles";"Infrastructure";"Likely increase in frequency of freeze-thaw cycles";"<ul><li>Infrastructure fatigue and degradation may increase.<ul><li>Potholes in the road may happen more frequently.</li><li>Road closures and loading restrictions for hauling may be required.</li><li>Possible increase in rain-on-snow events, freezing rain and other conditions that affect road maintenance and road safety.</li><li>Assess impacts on other transportation infrastructure such as sidewalks, trails, airports, and railways.</li></ul></li></ul>";
"4a-i-ag";"rule_2a-iii-bio && (temp_jja_iamean_smean_e25p > 0)";"Increase in Hot and Dry Conditions";"Agriculture";"Increased possibility of water shortages in summer and early fall";"<ul><li>Increases in hot and dry conditions may cause water shortages in summer and early fall.<ul><li>Competing water uses may necessitate collaborative planning to develop a water management strategy and improved water conservation practices.</li><li>Irrigation infrastructure may need improvement.</li><li>Regional and on-site water storage may need improvement or expansion.</li></ul></li></ul>";
"4a-ii-ag";"(temp_jja_iamean_smean_e25p > 0) && (prec_jja_iamean_smean_e75p < 0)";"Increase in Hot and Dry Conditions";"Agriculture";"Projected increase in hot/dry summers";"<ul><li>Potential crop productivity may improve.</li><li>Plant and livestock stress may increase, requiring management measures.</li></ul>";
"4a-iii-fish";"rule_4a-i-ag";"Increase in Hot and Dry Conditions";"Fisheries";"Possible thermal stress on fish and habitat";"<ul><li>Fish die-offs may occur or increase in frequency.</li><li>Reassessment of habitat protection and availability may be required.<ul><li>Review standards/riparian guidelines and regulations.</li></ul></li><li>Recreational use of habitat may require review.</li><li>Conflict with other water users should be anticipated and planned for.</li><li>Conservation status of fish species and ecosystems should be reviewed.</li><li>More complex management should be considered and balanced against trade-offs.</li><li>Species management conflicts may occur.</li><li>Fisheries allocation conflicts may occur.</li><li>Tourism may be negatively affected if sport fisheries are affected.</li></ul>";
"4a-iv-fish";"(temp_son_iamean_smean_e25p > 0) && (prec_son_iamean_smean_e75p < 0) && (pass_djf_iamean_smean_e75p < 0)";"Increase in Hot and Dry Conditions";"Fisheries";"Barriers to migratory fish or problems due to thermal stress on fish habitat";"<ul><li>Spawning failures may occur or increase.</li><li>Harvest may decline or be cancelled.</li><li>Fisheries harvest or allocations conflicts may occur.</li><li>Species at risk concerns should be considered.</li></ul>";"Note: also depends on glaciers and groundwater"
"4a-v-land";"rule_4a-i-ag || rule_2b-ii-for";"Increase in Hot and Dry Conditions";"Planning and Land Use";"Possible increase in dry & hot summers";"<ul><li>Industrial, commercial, residential, and agriculture demands may exhaust summer water supplies.<ul><li>Review water management practices, engage water users, reduce water usage, and manage service levels.</li></ul></li><li>Wildfires may increase in frequency and intensity.<ul><li>Undertake wildfire planning.</li><li>Summer wildfire response may result in park closures; this will result in a decrease in tourism.</li></ul></li><li>Native species may be negatively affected by heat and drought.<ul><li>Review management of invasive plants.</li><li>Consider planting of vegetation that will endure future climatic changes.</li></ul></li><li>Heat island effects may become more problematic.<ul><li>Consider tree planting for mitigation of heat island effects, and to improve streetscape.</li></ul></li><li>Urban Forestry Management Plan may need to be updated.</li><li>Recreation services may be reduced.</li><li>Tourism based on rafting, fishing, recreation at lakes may be negatively affected.</li></ul>";"Riparian zone peak flows in a hot and dry spiel? Come on..."
"4b-i-for";"rule_snow && (pass_djf_iamean_smean_e75p < 0 || pass_mam_iamean_smean_e75p < 0) && (nffd_djf_iamean_smean_e25p > 0 || nffd_mam_iamean_smean_e25p > 0)";"Decrease in Snowpack";"Forestry";"Possible shorter snow on ground period";"<ul><li>Winter logging season may become shorter.</li><li>Winter logging season will decrease.</li><li>Log stockpiling needs for mills may increase.</li></ul>";
"4b-ii-bio";"rule_4b-i-for";"Decrease in Snowpack";"Biodiversity";"Possible decrease in snowpack";"<ul><li>Alpine and subalpine species range may move up slope.</li><li>Species may become locally extinct at lower elevations.</li></ul>";
"4b-iii-land";"rule_4b-i-for";"Decrease in Snowpack";"Planning and Land Use";"Possible reduced snowfall";"<ul><li>Key tourist industries&mdash;such as ski hills, resorts, and back country recreation&mdash;may be negatively affected by reduced snowfall.</li></ul>";"Tourism..."
"5a-i-bio";"(temp_djf_iamean_smean_e25p > temp_djf_iastddev_smean_hist) || (temp_jja_iamean_smean_e25p > temp_jja_iastddev_smean_hist) || (rule_snow ? (((prec_djf_iamean_smean_e75p / 100) * prec_djf_iamean_smean_hist) > 0.75 * prec_djf_iastddev_smean_hist) : (((prec_ann_iamean_smean_e75p / 100) * prec_ann_iamean_smean_hist) > 0.75 * prec_ann_iastddev_smean_hist))";"Change in Species Range";"Biodiversity";"Possible change in species range";"<ul><li>Species interactions may be disrupted.</li><li>Amount and timing of use of different parts of species' range (eg summer vs. winter areas) may change.</li><li>Impact of invasion by exotic species may increase.</li><li>Populations of pollinators may change, causing a ripple effect on biodiversity and agriculture.</li><li>Plant and animal patterns&mdash;such as flowering, breeding, mating, and migrating&mdash;may change.</li><li>Biological productivity may change.</li><li>Species behaviour may change.</li><li>Species extinction, extirpation, and/or hyperabundance may occur.</li><li>Incidence of human/wildlife conflict may increase.</li><li>Timing and range of winter migration patterns may change.</li><li>Migration of some species may cease.</li><li>More generalist species may be favoured, causing a decrease in biodiversity.</li></ul>";
"5a-ii-ag";"rule_5a-i-bio";"Change in Species Range";"Agriculture";"Climate suitability range shifts";"<ul><li>Pests may become more successful, and range of invasive species may increase.<ul><li>Current cultivars and livestock breeds may not be well adapted to future climate.</li><li>Production systems may need to be re-evaluated and alternatives explored.</li><li>Monitoring of pests should be considered.</li><li>Response and/or management planning for pests, diseases, and weeds should be undertaken.</li><li>Options for improving resilience of agricultural production to pests, diseases, and weeds should be explored.</li><li>Options for dealing expeditiously with invasive species that are new to an area should be explored.</li></ul></li><li>Shifting species ranges, migration patterns, and increasing wildlife activity may negatively affect on agricultural crop productivity and quality.</li><li>Wildlife activity and changing migration patterns of birds may increase crop damage.</li></ul>";
"5a-iii-for";"(temp_jja_iamean_smean_e25p > 0) && (prec_jja_iamean_smean_e25p > 5)";"Change in Species Range";"Forestry";"Foliar and stem rusts more likely in pine plantations";"<ul><li>Select appropriate tree species for planting and avoid planting pine in these locations.</li></ul>";
"5b-i-for";"((rule_snow && (dg05_jja_iamean_smean_e25p > 0) && (prec_jja_iamean_smean_e25p > 5)) || (rule_shm < 60 && ((dg05_jja_iamean_smean_e75p / dg05_jja_iamean_smean_hist) < 0.05) && (prec_jja_iamean_smean_e25p > 0)))";"Possible Change in Productivity";"Forestry";"Forest productivity may increase";"<ul><li>Increase in growth, yield, and/or timber supply.</li></ul>";"Does not take into account losses due to drought events, disturbances."
"5b-ii-ag";"( ((dg05_jja_iamean_smean_e25p > 0)?1:0) + ((nffd_mam_iamean_smean_e25p  > 0)?1:0) + ((nffd_jja_iamean_smean_e25p > 0)?1:0) + ((nffd_son_iamean_smean_e25p > 0)?1:0) ) >= 3";"Possible Change in Productivity";"Agriculture";"Possible increase in growing season";"<ul><li>Increased productivity may be possible.</li><li>Production season may be longer.</li><li>New crops and varieties may become viable.</li><li>Potential range of southerly crops may expand, but also consider effects of possible increased spring rainfall.</li></ul>";
"6a-i-infra";"rule_1c-ii-land";"Waterlogged Soil";"Infrastructure";"Injuries and deaths from landslides";"<ul><li>Incorporate climate change information into public infrastructure design.</li><li>Provide landslide risk assessment.</li><li>Increase capacity of existing drainage infrastructure or augment with retention ponds.</li><li>Enhance slope stability through reforestation, engineering works.</li></ul>";"Non-climate causes: Infrastructure, extent of municipal infrastructure, Population, slope, past slides, condition of water system, rural isolation, Permafrost"
"6a-ii-land";"rule_1c-ii-land";"Waterlogged Soil";"Planning and Land Use";"Injuries and deaths from landslides";"<ul><li>Strengthen and enforce building codes and standards.</li><li>Draw up effective watershed management plans and emergency management plans.</li></ul>";
"6b-i-infra";"rule_2a-iii-bio || rule_1a-i-hydro";"Human Health Effects";"Infrastructure";"Infection and morbidity related to water quality";"<ul><li>Incorporate climate change information into public infrastructure design and regional land use management (water utilities, wastewater, manure storage).</li></ul>";"Non-climate causes: Chemical contaminants tailing ponds, ag runoff, other industry"
"6b-ii-land";"rule_2a-iii-bio || rule_1a-i-hydro";"Human Health Effects";"Planning and Land Use";"Infection and morbidity related to water quality";"<ul><li>Draw up effective emergency management plans and prediction measures.</li><li>Assess vulnerability of wells and small systems to microbial or chemical contamination.</li><li>Update flood maps and improve storm surge surveillance.</li><li>Review and update dilution ratios for agricultural and industrial contaminants.</li></ul>";
"6b-iii-health";"rule_2a-iii-bio || rule_1a-i-hydro";"Human Health Effects";"Health";"Infection and morbidity related to water quality";"<ul><li>Educate and communicate to the public on E. Coli and other waterborne diseases and their impact on water use.</li></ul>";
"6c-i-infra";"rule_3b-ii-ag";"Considerable Increase in Temperature";"Infrastructure";"Cardiovascular and respiratory stress and morbidity, heat stroke, and heat exhaustion";"<ul><li>Manage urban heat island effect: more trees and greenspace, more parks, special paving materials.</li><li>Provide cooling in parks via water features and building design and provide drinking fountains and cooling stations in outdoor public places.</li></ul>";
"6c-ii-land";"rule_3b-ii-ag";"Considerable Increase in Temperature";"Planning and Land Use";"Cardiovascular and respiratory stress and morbidity, heat stroke, and heat exhaustion";"<ul><li>Ensure labour standards limiting time in hot conditions are enforced.</li><li>Update building codes to incorporate heat resilient features such as high thermal mass building materials, improved insulation, and exterior shutters.</li></ul>";
"6c-iii-health";"rule_3b-ii-ag";"Considerable Increase in Temperature";"Health";"Cardiovascular and respiratory stress and morbidity, heat stroke, and heat exhaustion";"<ul><li>Plan for additional strain on medical facilities during heat events.</li><li>Inform people on importance of hydration and avoiding isolation.</li><li>Identify and reach out to vulnerable populations.</li><li>Ensure that the elderly and those in poor health have support systems.</li></ul>";
"6d-i-health";"(dg05_ann_iamean_smean_e25p > 0)";"Change in Species Range";"Health";"Respiratory and cardiovascular illness from allergens";"<ul><li>Provide information about action to take to reduce exposure to air pollutants, with a focus on vulnerable groups.</li><li>Issue pollen indicators to the public.</li><li>Undertake public health education programs about allergens.</li></ul>";
"6e-i-for";"rule_2b-ii-for";"Longer Dry Season";"Forestry";"Illness, injury and morbidity from wildfire";"<ul><li>Evaluate staffing and distribution of forest protection staff and resources in response to wildfire.</li><li>Use best practices to manage fuel buildup and limit extent of fires where they occur.</li></ul>";
"6e-ii-infra";"rule_2b-ii-for";"Longer Dry Season";"Infrastructure";"Illness, injury and morbidity from wildfire";"<ul><li>Employ traffic restrictions when warranted to prevent exposure to fire or excessive smoke levels.</li><li>Update air quality indicators.</li></ul>";
"6e-iii-health";"rule_2b-ii-for";"Longer Dry Season";"Health";"Illness, injury and morbidity from wildfire";"<ul><li>Inform the public about fire smart, emergency management plans, and disaster response plans.</li><li>Issue Air Quality Health Index to the public.</li><li>Provide information about actions to take to reduce exposure to air pollutants, focusing on vulnerable groups.</li></ul>";
"6f-i-land";"rule_1a-i-hydro || rule_1c-ii-land";"High Intensity Precipitation";"Planning and Land Use";"Illness, injury and morbidity due to flooding";"<ul><li>Provide efficient emergency management planning.</li><li>Improve building codes in flood-prone areas to reduce vulnerability of buildings to mold.</li></ul>";
"6g-i-land";"rule_2a-iii-bio || rule_1a-i-hydro";"Human Health Effects";"Planning and Land Use";"Water contamination";"<ul><li>Create maps of vulnerability to water contamination.</li></ul>";
"6g-ii-ag";"rule_2a-iii-bio || rule_1a-i-hydro";"Human Health Effects";"Agriculture";"Water contamination";"<ul><li>Examine on-farm practices such as sizing of water storage ponds and crop choices.</li></ul>";
"6g-iii-infra";"rule_2a-iii-bio || rule_1a-i-hydro";"Human Health Effects";"Infrastructure";"Water contamination";"<ul><li>Ensure watersheds are protected and engineering works are well maintained.</li></ul>";
"6h-i-ag";"rule_2a-iii-bio || rule_1a-i-hydro";"Human Health Effects";"Agriculture";"Contamination of food by waterborne pathogens";"<ul><li>Examine effects of on-farm practices on contamination of crops.</li></ul>";"This is weak."
"6h-ii-health";"rule_2a-iii-bio || rule_1a-i-hydro";"Human Health Effects";"Health";"Contamination of food by waterborne pathogens";"<ul><li>Inform people on food contamination risks and precautions to take to avoid these risks.</li><li>Provide First Nations groups about loss of ancestral foods with high cultural significance.</li></ul>";
"6i-i-land";"rule_1a-vi-ag || rule_3b-ii-ag || rule_2a-iii-bio || rule_1a-i-hydro || rule_2a-vi-ag";"Human Health Effects";"Planning and Land Use";"Restriction in access to food supplies or limited food supplies";"<ul><li>Organise food reserve to prevent food insecurity and consumer goods rivalry, particularly in isolated areas.</li><li>Create community gardens and common kitchens in urban areas.</li></ul>";
"6i-ii-ag";"rule_1a-vi-ag || rule_3b-ii-ag || rule_2a-iii-bio || rule_1a-i-hydro || rule_2a-vi-ag";"Human Health Effects";"Agriculture";"Restriction in access to food supplies or limited food supplies";"<ul><li>Examine vulnerability of agricultural areas to projected climate change and examine adaptation strategies to ensure reliable food supplies.</li></ul>";
"6j-i-land";1;"Human Health Effects";"Planning and Land Use";"Stress related illness";"<ul><li>Provide support for vulnerable populations.</li><li>Incorporate climate change information into planning processes.</li></ul>";
"6k-i-health";"rule_5a-i-bio || (temp_djf_iamean_smean_e25p > temp_djf_iastddev_smean_hist) || (temp_mam_iamean_smean_e25p > temp_mam_iastddev_smean_hist) || (temp_jja_iamean_smean_e25p > temp_jja_iastddev_smean_hist) || (temp_son_iamean_smean_e25p > temp_son_iastddev_smean_hist)";"Increase in Temperature";"Health";"Shifting infectious disease patterns";"<ul><li>Research possible new diseases that were previously not a concern, including research into climate niches for particular species'.</li><li>Perform public immunization programs when research indicates increased risk.</li><li>Inform the public on risks and precautions to take when novel infectious diseases are expected in a region.</li></ul>";
"6k-ii-land";"rule_5a-i-bio || (temp_djf_iamean_smean_e25p > temp_djf_iastddev_smean_hist) || (temp_mam_iamean_smean_e25p > temp_mam_iastddev_smean_hist) || (temp_jja_iamean_smean_e25p > temp_jja_iastddev_smean_hist) || (temp_son_iamean_smean_e25p > temp_son_iastddev_smean_hist)";"Increase in Temperature";"Planning and Land Use";"Shifting infectious disease patterns";"<ul><li>Map areas that may be of particular concern for future infectious diseases using information from infectious disease researchers.</li></ul>";`;

// export const rawCsv =
// `"snow";"(temp_djf_iamean_s0p_hist <= -6)";;;"Internal rule";"Hamlet et al. (2007) broadly characterized snowmelt dominant basins as those with DJF below -6&deg;C, hybrid basins as those with DJF between -6&deg;C and 5&deg;C, and rain dominant basins those with a DJF exceeding 5&deg;C. Snow dominated basins are defined for this purpose as basins where the spatial median of temperature is less than or equal to -6&deg;C.";"internal snow rule"
// "hybrid";"((temp_djf_iamean_s0p_hist <= -6) && (temp_djf_iamean_s100p_hist >= -6)) || ((temp_djf_iamean_s0p_hist <= 5) && (temp_djf_iamean_s100p_hist >= 5)) || ((temp_djf_iamean_s0p_hist >= -6) && (temp_djf_iamean_s100p_hist <= 5))";;;"Internal rule";"Hybrid basins are basins which spatially vary sufficiently that they include temperature values between -6&deg;C and +5&deg;C.";"internal Hybrid rule"
// "rain";"(temp_djf_iamean_s100p_hist >= 5)";;;"Internal rule";"Rain-dominated basins are defined as basins where the spatial median temperature is greater than +5&deg;C; as per Hamlet et al.";"internal Rain rule"`;

export const byLines = rawCsv.split('\n');

// Transform a function `f` into a function that recursively reapplies `f` to
// its argument until a fixed point of `f` is reached, i.e., until applying `f`
// results in no further changes. Useful for repeating a transformation upon
// a string until nothing is left to be transformed.
export const recurse = f =>
  s => {
    const helper = (prev, curr) => prev === curr ? curr : helper(curr, f(curr));
    return helper('', s);
  };

// Internal quotes (which are escaped by doubling in CSV) pose a problem
// for processing the outer quotes that surround the content. Therefore
// we recode the doubled quotes in an unconfusing way.
export const internalQuoteRecoding = '!Q!'
// This recoding algorithm assumes that there will never be a degenerate
// case of an empty column signified by "". If not, this gets harder.
export const recodeInternalQuotes = replace(/""/g, internalQuoteRecoding);
export const restoreInternalQuotes = replace(
  RegExp(`${internalQuoteRecoding}`, 'g'),
  '"'
);

// Similarly, semicolons inside the quoted content of columsn pose a problem.
export const internalSemiRecoding = '!S!'
export const recodeInternalSemis = recurse(
  replace(
    /(;"[^"]*);([^"]*";)/g,
    `$1${internalSemiRecoding}$2`
    )
);
export const restoreInternalSemis = replace(
  RegExp(`${internalSemiRecoding}`, 'g'),
  ';'
);

// Except for a few cases, column contents are double-quoted, and we use that
// pattern to separate columns. `quoteUnquotedCols` quotes those that aren't.
export const quoteUnquotedCols = recurse(
  flow(
    replace(/^;/, '"";'),               // First column
    replace(/;([^";]*?);/g, ';"$1";'),  // Middle columns
  replace(/;$/, ';""'),                 // Last column
  )
);

export const byLinesThenColumns =
  flow(
    // take(3),
    map(
      flow(
        recodeInternalQuotes,
        recodeInternalSemis,
        quoteUnquotedCols,
        // To avoid some post-splitting complication, remove the first and last
        // quotes in a line.
        replace(/^\s*"|"\s*$/g, ''),
        // Split into columns on now reliable and uniform separator.
        split('";"'),
        // Now that columns have been split, the recoding must be undone on
        // each column.
        map(
          flow(
            restoreInternalSemis,
            restoreInternalQuotes,
          )
        ),
      )
    ),
  )(byLines);

export const propNames = ["id", "condition", "category", "sector", "effects", "notes", "comment"];
export const linesAsObjects = map(line => zipObject(propNames, line))(byLinesThenColumns);

export default linesAsObjects;

// categories:
// [ '',
//   'Change in Species Range',
//   'Considerable Increase in Temperature',
//   'Decrease in Snowpack',
//   'High Intensity Precipitation',
//   'Human Health Effects',
//   'Increase in Freeze/Thaw Cycles',
//   'Increase in Hot and Dry Conditions',
//   'Increase in Temperature',
//   'Longer Dry Season',
//   'Possible Change in Productivity',
//   'Possible Flooding',
//   'Reduced Water Supply',
//   'Sea Level Rise / Storm Surge',
//   'Shift in Hydrologic Regime Classification',
//   'Stress related illness',
//   'Waterlogged Soil' ]

// sectors:
// [ '',
//     'Agriculture',
//     'Biodiversity',
//     'Fisheries',
//     'Forestry',
//     'Health',
//     'Hydrology',
//     'Infrastructure',
//     'Land Use Planning' ]

// effects:
// [ 'Barriers to migratory fish or problems due to thermal stress on fish habitat',
//     'Cardiovascular and respiratory stress and morbidity, heat stroke, and heat exhaustion',
//     'Climate suitability range shifts',
//     'Contamination of food by waterborne pathogens',
//     'Decrease in frost penetration',
//     'Earlier freshet and extended dry season',
//     'Earlier spring lake ice melt',
//     'Extreme rainfall events may increase in frequency',
//     'Foliar and stem rusts more likely in pine plantations',
//     'Forest productivity may increase',
//     'Higher intensity and/or frequency of rainfall events',
//     'Higher intensity and/or frequency of seasonal precipitation',
//     'Illness, injury and morbidity due to flooding',
//     'Illness, injury and morbidity from wildfire',
//     'Increase in extreme rainfall events',
//     'Increase in frequency of occurrence of high temperatures',
//     'Increased debris flow risk',
//     'Increased possibility of drought',
//     'Increased possibility of drought or increased salinity of wetlands',
//     'Increased possibility of water shortages in summer and early fall',
//     'Increased runoff and potential flooding',
//     'Infection and morbidity related to water quality',
//     'Injuries and deaths from landslides',
//     'Internal rule',
//     'Likely increase in frequency of freeze-thaw cycles',
//     'Opportunities for facilitated migration of tree species',
//     'Possible change in species range',
//     'Possible decrease in snowpack',
//     'Possible increase in dry & hot summers',
//     'Possible increase in fire season length',
//     'Possible increase in flow barrier for returning salmon',
//     'Possible increase in growing season',
//     'Possible increase in heat-related health impacts',
//     'Possible increase in waterlogged soil',
//     'Possible increased incidence of flooding',
//     'Possible loss of snow melt dominant watersheds within region',
//     'Possible reduced snowfall',
//     'Possible reduced summer stream flow and lower ground water table',
//     'Possible shorter snow on ground period',
//     'Possible thermal stress on fish and habitat',
//     'Possible transition to rainfall dominant watersheds within region',
//     'Potentially damaging high river flows',
//     'Projected increase in hot/dry summers',
//     'Projected summer or winter temperature change is larger than the standard deviation of historical interannual variability',
//     'Respiratory and cardiovascular illness from allergens',
//     'Restriction in access to food supplies or limited food supplies',
//     'Sea level rise and possible increase in storm surges',
//     'Seasonal moisture availability decreases',
//     'Seasonal moisture availability increases',
//     'Shifting infectious disease patterns',
//     'Shorter access season where winter access requires frozen roads',
//     'Stress related illness',
//     'Transportation and other temperature-sensitive infrastructure components could be adversely affected',
//     'Warmer and shorter cold season',
//     'Water contamination' ]
