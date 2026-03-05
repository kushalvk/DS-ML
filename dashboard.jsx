import { useState, useMemo, useCallback } from "react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, ScatterChart, Scatter, ZAxis } from "recharts";

// ── Embedded sample data (100 containers) ──────────────────────────────────
const SAMPLE_DATA = [{"id":"CONT749837","score":100.0,"level":"Critical","origin":"SD","value":1893178,"dw":2210.6,"mw":5174.4,"dwell":0.7,"hs":"9013","line":"PIL","expl":"Risk indicators: measured weight is 134% higher than declared; unusually high value-per-kg ($856/kg); medium-risk origin country."},{"id":"CONT443912","score":99.5,"level":"Critical","origin":"LY","value":1517284,"dw":3505.3,"mw":12668.3,"dwell":0.8,"hs":"7108","line":"HMM","expl":"Risk indicators: measured weight is 261% higher than declared; unusually high value-per-kg ($433/kg); high-risk origin country."},{"id":"CONT256570","score":99.0,"level":"Critical","origin":"KP","value":1474064,"dw":10501.7,"mw":1943.5,"dwell":1.1,"hs":"9013","line":"PIL","expl":"Risk indicators: measured weight is 82% lower than declared; unusually high value-per-kg ($140/kg); high-risk origin country."},{"id":"CONT594829","score":98.5,"level":"Critical","origin":"IR","value":884064,"dw":5427.7,"mw":520.3,"dwell":0.5,"hs":"7108","line":"MSC","expl":"Risk indicators: measured weight is 90% lower than declared; unusually high value-per-kg ($163/kg); high-risk origin country."},{"id":"CONT912744","score":98.0,"level":"Critical","origin":"SY","value":1262983,"dw":2079.9,"mw":7064.2,"dwell":1.3,"hs":"8703","line":"ONE","expl":"Risk indicators: measured weight is 240% higher than declared; unusually high value-per-kg ($607/kg); high-risk origin country."},{"id":"CONT532941","score":97.5,"level":"Critical","origin":"PK","value":1920488,"dw":3958.8,"mw":9794.7,"dwell":0.7,"hs":"8542","line":"COSCO","expl":"Risk indicators: measured weight is 147% higher than declared; unusually high value-per-kg ($485/kg); medium-risk origin country."},{"id":"CONT895326","score":97.0,"level":"Critical","origin":"MM","value":1098238,"dw":8254.9,"mw":5096.9,"dwell":0.9,"hs":"8517","line":"YML","expl":"Risk indicators: measured weight is 38% lower than declared; unusually high value-per-kg ($133/kg); high-risk origin country."},{"id":"CONT922827","score":96.5,"level":"Critical","origin":"KP","value":877499,"dw":6862.5,"mw":347.9,"dwell":0.4,"hs":"2710","line":"HAPAG","expl":"Risk indicators: measured weight is 95% lower than declared; unusually high value-per-kg ($128/kg); high-risk origin country."},{"id":"CONT461447","score":96.0,"level":"Critical","origin":"NG","value":614438,"dw":11823.2,"mw":14843.7,"dwell":140.2,"hs":"8471","line":"MAERSK","expl":"Risk indicators: measured weight is 26% higher than declared; medium-risk origin country; excessive dwell time (140 hrs)."},{"id":"CONT317314","score":95.5,"level":"Critical","origin":"SD","value":428191,"dw":9543.1,"mw":188.5,"dwell":74.3,"hs":"8542","line":"CMA CGM","expl":"Risk indicators: measured weight is 98% lower than declared; medium-risk origin country; excessive dwell time (74 hrs)."},{"id":"CONT771023","score":95.0,"level":"Critical","origin":"AF","value":521834,"dw":4823.7,"mw":12089.5,"dwell":0.3,"hs":"6110","line":"EVERGREEN","expl":"Risk indicators: measured weight is 151% higher than declared; medium-risk origin country; unusually short dwell time."},{"id":"CONT384612","score":94.5,"level":"Critical","origin":"IR","value":1342765,"dw":7234.8,"mw":1823.2,"dwell":88.5,"hs":"9013","line":"MSC","expl":"Risk indicators: measured weight is 75% lower than declared; high-risk origin country; excessive dwell time (89 hrs)."},{"id":"CONT628451","score":94.0,"level":"Critical","origin":"YE","value":987432,"dw":3421.6,"mw":8934.2,"dwell":1.2,"hs":"2933","line":"PIL","expl":"Risk indicators: measured weight is 161% higher than declared; unusually high value-per-kg ($289/kg); high-risk origin country."},{"id":"CONT195837","score":93.5,"level":"Critical","origin":"LY","value":2145632,"dw":5678.3,"mw":1234.7,"dwell":0.6,"hs":"8471","line":"HMM","expl":"Risk indicators: measured weight is 78% lower than declared; unusually high value-per-kg ($378/kg); high-risk origin country."},{"id":"CONT847291","score":93.0,"level":"Critical","origin":"VE","value":1567823,"dw":8912.4,"mw":18234.6,"dwell":112.3,"hs":"8703","line":"COSCO","expl":"Risk indicators: measured weight is 105% higher than declared; high-risk origin country; excessive dwell time (112 hrs)."},{"id":"CONT563018","score":92.5,"level":"Critical","origin":"MM","value":734521,"dw":2345.6,"mw":6789.1,"dwell":0.4,"hs":"7108","line":"ONE","expl":"Risk indicators: measured weight is 190% higher than declared; high-risk origin country; unusually short dwell time."},{"id":"CONT291743","score":92.0,"level":"Critical","origin":"KP","value":1893456,"dw":12456.7,"mw":2134.5,"dwell":0.8,"hs":"2710","line":"MAERSK","expl":"Risk indicators: measured weight is 83% lower than declared; unusually high value-per-kg ($152/kg); high-risk origin country."},{"id":"CONT742198","score":91.5,"level":"Critical","origin":"CF","value":456789,"dw":3456.8,"mw":9123.4,"dwell":95.7,"hs":"8517","line":"YML","expl":"Risk indicators: measured weight is 164% higher than declared; medium-risk origin country; excessive dwell time (96 hrs)."},{"id":"CONT418265","score":91.0,"level":"Critical","origin":"SY","value":1234567,"dw":6789.2,"mw":1234.5,"dwell":1.0,"hs":"8542","line":"CMA CGM","expl":"Risk indicators: measured weight is 82% lower than declared; unusually high value-per-kg ($182/kg); high-risk origin country."},{"id":"CONT837492","score":90.5,"level":"Critical","origin":"IQ","value":876543,"dw":4567.8,"mw":11234.5,"dwell":78.3,"hs":"9013","line":"HAPAG","expl":"Risk indicators: measured weight is 146% higher than declared; medium-risk origin country; excessive dwell time (78 hrs)."},{"id":"CONT654321","score":90.0,"level":"Critical","origin":"PK","value":1456789,"dw":9234.5,"mw":2345.6,"dwell":0.5,"hs":"6110","line":"EVERGREEN","expl":"Risk indicators: measured weight is 75% lower than declared; high-risk origin country; unusually short dwell time."},{"id":"CONT923847","score":89.5,"level":"Critical","origin":"SD","value":2134567,"dw":3456.7,"mw":8901.2,"dwell":1.4,"hs":"2933","line":"MSC","expl":"Risk indicators: measured weight is 158% higher than declared; unusually high value-per-kg ($617/kg); medium-risk origin country."},{"id":"CONT187264","score":89.0,"level":"Critical","origin":"NG","value":567890,"dw":7890.1,"mw":16789.2,"dwell":134.6,"hs":"8471","line":"PIL","expl":"Risk indicators: measured weight is 113% higher than declared; medium-risk origin country; excessive dwell time (135 hrs)."},{"id":"CONT345678","score":88.5,"level":"Critical","origin":"AF","value":789012,"dw":2678.9,"mw":7890.1,"dwell":0.3,"hs":"8703","line":"COSCO","expl":"Risk indicators: measured weight is 195% higher than declared; medium-risk origin country; unusually short dwell time."},{"id":"CONT512984","score":88.0,"level":"Critical","origin":"LY","value":1678901,"dw":8901.2,"mw":1567.8,"dwell":0.7,"hs":"8542","line":"ONE","expl":"Risk indicators: measured weight is 82% lower than declared; unusually high value-per-kg ($188/kg); high-risk origin country."},{"id":"CONT768432","score":87.5,"level":"Critical","origin":"IR","value":934567,"dw":4321.5,"mw":10234.5,"dwell":67.4,"hs":"7108","line":"MAERSK","expl":"Risk indicators: measured weight is 137% higher than declared; high-risk origin country; excessive dwell time (67 hrs)."},{"id":"CONT234987","score":87.0,"level":"Critical","origin":"MM","value":1123456,"dw":5678.9,"mw":1234.5,"dwell":0.9,"hs":"2710","line":"YML","expl":"Risk indicators: measured weight is 78% lower than declared; high-risk origin country; declared during off-hours."},{"id":"CONT891234","score":86.5,"level":"Critical","origin":"SO","value":678901,"dw":3234.5,"mw":8901.2,"dwell":89.2,"hs":"8517","line":"CMA CGM","expl":"Risk indicators: measured weight is 175% higher than declared; medium-risk origin country; excessive dwell time (89 hrs)."},{"id":"CONT456789","score":86.0,"level":"Critical","origin":"KP","value":1789012,"dw":10234.5,"mw":2134.5,"dwell":0.4,"hs":"9013","line":"HAPAG","expl":"Risk indicators: measured weight is 79% lower than declared; unusually high value-per-kg ($175/kg); high-risk origin country."},{"id":"CONT673829","score":85.5,"level":"Critical","origin":"YE","value":845678,"dw":2901.2,"mw":7234.5,"dwell":1.1,"hs":"6110","line":"EVERGREEN","expl":"Risk indicators: measured weight is 149% higher than declared; high-risk origin country; unusually short dwell time."},{"id":"CONT312456","score":85.0,"level":"Critical","origin":"VE","value":567890,"dw":6789.1,"mw":1234.5,"dwell":101.3,"hs":"2933","line":"MSC","expl":"Risk indicators: measured weight is 82% lower than declared; high-risk origin country; excessive dwell time (101 hrs)."},{"id":"CONT879012","score":84.5,"level":"Critical","origin":"SD","value":1234567,"dw":4567.8,"mw":11234.5,"dwell":0.6,"hs":"8471","line":"PIL","expl":"Risk indicators: measured weight is 146% higher than declared; medium-risk origin country; unusually high value-per-kg ($270/kg)."},{"id":"CONT567234","score":84.0,"level":"Critical","origin":"PK","value":2345678,"dw":8901.2,"mw":1789.0,"dwell":0.8,"hs":"8703","line":"COSCO","expl":"Risk indicators: measured weight is 80% lower than declared; unusually high value-per-kg ($263/kg); medium-risk origin country."},{"id":"CONT124789","score":83.5,"level":"Critical","origin":"NG","value":890123,"dw":3456.7,"mw":9012.3,"dwell":78.9,"hs":"8542","line":"ONE","expl":"Risk indicators: measured weight is 161% higher than declared; medium-risk origin country; excessive dwell time (79 hrs)."},{"id":"CONT789345","score":83.0,"level":"Critical","origin":"CF","value":456789,"dw":7890.1,"mw":1678.9,"dwell":0.5,"hs":"7108","line":"MAERSK","expl":"Risk indicators: measured weight is 79% lower than declared; medium-risk origin country; unusually short dwell time."},{"id":"CONT234561","score":82.5,"level":"Critical","origin":"IQ","value":1678901,"dw":2345.6,"mw":6789.1,"dwell":56.7,"hs":"2710","line":"YML","expl":"Risk indicators: measured weight is 190% higher than declared; medium-risk origin country; excessive dwell time (57 hrs)."},{"id":"CONT678912","score":82.0,"level":"Critical","origin":"AF","value":789012,"dw":5678.9,"mw":12345.6,"dwell":1.2,"hs":"8517","line":"CMA CGM","expl":"Risk indicators: measured weight is 117% higher than declared; medium-risk origin country; declared during off-hours."},{"id":"CONT345679","score":81.5,"level":"Critical","origin":"LY","value":1890123,"dw":9012.3,"mw":1678.9,"dwell":0.7,"hs":"9013","line":"HAPAG","expl":"Risk indicators: measured weight is 81% lower than declared; unusually high value-per-kg ($210/kg); high-risk origin country."},{"id":"CONT901234","score":81.0,"level":"Critical","origin":"IR","value":1012345,"dw":4567.8,"mw":10234.5,"dwell":93.4,"hs":"6110","line":"EVERGREEN","expl":"Risk indicators: measured weight is 124% higher than declared; high-risk origin country; excessive dwell time (93 hrs)."},{"id":"CONT456790","score":80.5,"level":"Critical","origin":"MM","value":678901,"dw":2901.2,"mw":7890.1,"dwell":0.4,"hs":"2933","line":"MSC","expl":"Risk indicators: measured weight is 172% higher than declared; high-risk origin country; unusually short dwell time."},{"id":"CONT789346","score":80.0,"level":"Critical","origin":"SO","value":234567,"dw":7234.5,"mw":1345.6,"dwell":0.9,"hs":"8471","line":"PIL","expl":"Risk indicators: measured weight is 81% lower than declared; medium-risk origin country; declared during off-hours."},{"id":"CONT123458","score":79.5,"level":"Critical","origin":"KP","value":1567890,"dw":3456.7,"mw":8901.2,"dwell":1.3,"hs":"8703","line":"COSCO","expl":"Risk indicators: measured weight is 158% higher than declared; unusually high value-per-kg ($454/kg); high-risk origin country."},{"id":"CONT567235","score":79.0,"level":"Critical","origin":"YE","value":890123,"dw":8901.2,"mw":1678.9,"dwell":0.6,"hs":"8542","line":"ONE","expl":"Risk indicators: measured weight is 81% lower than declared; high-risk origin country; unusually short dwell time."},{"id":"CONT901235","score":78.5,"level":"Critical","origin":"SD","value":1123456,"dw":5678.9,"mw":12789.1,"dwell":82.3,"hs":"7108","line":"MAERSK","expl":"Risk indicators: measured weight is 125% higher than declared; medium-risk origin country; excessive dwell time (82 hrs)."},{"id":"CONT234562","score":78.0,"level":"Critical","origin":"VE","value":678901,"dw":2345.6,"mw":6234.5,"dwell":0.8,"hs":"2710","line":"YML","expl":"Risk indicators: measured weight is 166% higher than declared; high-risk origin country; declared during off-hours."},{"id":"CONT678913","score":77.5,"level":"Critical","origin":"NG","value":1890123,"dw":9012.3,"mw":1789.0,"dwell":0.5,"hs":"8517","line":"CMA CGM","expl":"Risk indicators: measured weight is 80% lower than declared; unusually high value-per-kg ($210/kg); medium-risk origin country."},{"id":"CONT345680","score":77.0,"level":"Critical","origin":"PK","value":456789,"dw":4567.8,"mw":11234.5,"dwell":71.2,"hs":"9013","line":"HAPAG","expl":"Risk indicators: measured weight is 146% higher than declared; medium-risk origin country; excessive dwell time (71 hrs)."},{"id":"CONT789347","score":76.5,"level":"Critical","origin":"AF","value":1012345,"dw":7890.1,"mw":1567.8,"dwell":1.1,"hs":"6110","line":"EVERGREEN","expl":"Risk indicators: measured weight is 80% lower than declared; medium-risk origin country; declared during off-hours."},{"id":"CONT123459","score":76.0,"level":"Critical","origin":"LY","value":2234567,"dw":3456.7,"mw":8234.5,"dwell":0.4,"hs":"2933","line":"MSC","expl":"Risk indicators: measured weight is 138% higher than declared; unusually high value-per-kg ($646/kg); high-risk origin country."},{"id":"CONT567236","score":75.5,"level":"Critical","origin":"IQ","value":789012,"dw":8901.2,"mw":18234.5,"dwell":98.7,"hs":"8471","line":"PIL","expl":"Risk indicators: measured weight is 105% higher than declared; medium-risk origin country; excessive dwell time (99 hrs)."},{"id":"CONT234567","score":74.8,"level":"High","origin":"FR","value":87432,"dw":3421.0,"mw":4123.0,"dwell":18.2,"hs":"8471","line":"MAERSK","expl":"Minor flags noted (measured weight 21% higher than declared; weekend submission), but overall low risk profile."},{"id":"CONT891237","score":73.9,"level":"High","origin":"US","value":124560,"dw":5678.0,"mw":4901.0,"dwell":22.1,"hs":"8517","line":"MSC","expl":"Minor flags noted (weekend submission; declared during off-hours), but overall low risk profile."},{"id":"CONT456793","score":72.4,"level":"High","origin":"DE","value":98234,"dw":2345.0,"mw":3012.0,"dwell":31.5,"hs":"8703","line":"CMA CGM","expl":"Minor flags noted (measured weight 28% higher than declared), but overall low risk profile."},{"id":"CONT678916","score":71.2,"level":"High","origin":"GB","value":67891,"dw":4567.0,"mw":3890.0,"dwell":14.3,"hs":"6110","line":"COSCO","expl":"Minor flags noted (weekend submission), but overall low risk profile."},{"id":"CONT345683","score":70.1,"level":"High","origin":"JP","value":187654,"dw":6789.0,"mw":8234.0,"dwell":28.7,"hs":"2710","line":"EVERGREEN","expl":"Minor flags noted (measured weight 21% higher than declared; declared during off-hours), but overall low risk profile."},{"id":"CONT901238","score":69.3,"level":"High","origin":"CA","value":54321,"dw":3456.0,"mw":2789.0,"dwell":19.8,"hs":"9013","line":"HAPAG","expl":"Minor flags noted (measured weight 19% lower than declared), but overall low risk profile."},{"id":"CONT123462","score":68.7,"level":"High","origin":"AU","value":76543,"dw":8901.0,"mw":10234.0,"dwell":36.2,"hs":"7108","line":"ONE","expl":"Minor flags noted (measured weight 15% higher than declared; weekend submission), but overall low risk profile."},{"id":"CONT567239","score":67.5,"level":"High","origin":"SG","value":234561,"dw":2678.0,"mw":3145.0,"dwell":12.4,"hs":"8542","line":"YML","expl":"Minor flags noted (declared during off-hours), but overall low risk profile."},{"id":"CONT789350","score":66.8,"level":"High","origin":"NL","value":145678,"dw":5123.0,"mw":4456.0,"dwell":24.6,"hs":"2933","line":"MAERSK","expl":"Minor flags noted (measured weight 13% lower than declared), but overall low risk profile."},{"id":"CONT234568","score":65.4,"level":"High","origin":"CH","value":98765,"dw":3789.0,"mw":4567.0,"dwell":42.3,"hs":"8471","line":"PIL","expl":"Minor flags noted (measured weight 21% higher than declared; excessive dwell time (42 hrs)), but overall low risk profile."},{"id":"CONT891241","score":64.9,"level":"High","origin":"US","value":56789,"dw":7234.0,"mw":6123.0,"dwell":17.8,"hs":"8517","line":"CMA CGM","expl":"Minor flags noted (weekend submission), but overall low risk profile."},{"id":"CONT456796","score":63.7,"level":"High","origin":"DE","value":167890,"dw":4568.0,"mw":5234.0,"dwell":33.2,"hs":"8703","line":"COSCO","expl":"Minor flags noted (measured weight 15% higher than declared), but overall low risk profile."},{"id":"CONT678919","score":62.3,"level":"High","origin":"FR","value":87654,"dw":2901.0,"mw":2456.0,"dwell":21.5,"hs":"6110","line":"EVERGREEN","expl":"Minor flags noted (measured weight 15% lower than declared; declared during off-hours), but overall low risk profile."},{"id":"CONT345686","score":61.8,"level":"High","origin":"GB","value":45678,"dw":6234.0,"mw":7123.0,"dwell":29.4,"hs":"2710","line":"HAPAG","expl":"Minor flags noted (measured weight 14% higher than declared; weekend submission), but overall low risk profile."},{"id":"CONT901241","score":60.5,"level":"High","origin":"JP","value":123456,"dw":8901.0,"mw":7678.0,"dwell":15.7,"hs":"9013","line":"ONE","expl":"Minor flags noted (measured weight 14% lower than declared), but overall low risk profile."},{"id":"CONT123465","score":59.2,"level":"High","origin":"CA","value":78901,"dw":3456.0,"mw":4012.0,"dwell":38.1,"hs":"7108","line":"YML","expl":"Minor flags noted (measured weight 16% higher than declared; declared during off-hours), but overall low risk profile."},{"id":"CONT567242","score":58.7,"level":"High","origin":"SG","value":234567,"dw":5678.0,"mw":4890.0,"dwell":23.4,"hs":"8542","line":"MAERSK","expl":"Minor flags noted (weekend submission), but overall low risk profile."},{"id":"CONT789353","score":57.4,"level":"High","origin":"AU","value":67890,"dw":2345.0,"mw":2789.0,"dwell":18.9,"hs":"2933","line":"MSC","expl":"Minor flags noted (measured weight 19% higher than declared; declared during off-hours), but overall low risk profile."},{"id":"CONT234571","score":56.8,"level":"High","origin":"NL","value":145678,"dw":7890.0,"mw":6789.0,"dwell":26.7,"hs":"8471","line":"CMA CGM","expl":"Minor flags noted (measured weight 14% lower than declared), but overall low risk profile."},{"id":"CONT891244","score":55.3,"level":"High","origin":"CH","value":98765,"dw":4123.0,"mw":4789.0,"dwell":41.2,"hs":"8517","line":"COSCO","expl":"Minor flags noted (measured weight 16% higher than declared; excessive dwell time (41 hrs)), but overall low risk profile."},{"id":"CONT456799","score":54.9,"level":"High","origin":"US","value":56234,"dw":6789.0,"mw":5901.0,"dwell":16.3,"hs":"8703","line":"EVERGREEN","expl":"Minor flags noted (weekend submission; declared during off-hours), but overall low risk profile."},{"id":"CONT678922","score":53.7,"level":"High","origin":"DE","value":189012,"dw":3456.0,"mw":4123.0,"dwell":32.8,"hs":"6110","line":"HAPAG","expl":"Minor flags noted (measured weight 19% higher than declared), but overall low risk profile."},{"id":"CONT345689","score":52.4,"level":"High","origin":"FR","value":78901,"dw":9012.0,"mw":7789.0,"dwell":14.6,"hs":"2710","line":"ONE","expl":"Minor flags noted (measured weight 14% lower than declared; declared during off-hours), but overall low risk profile."},{"id":"CONT901244","score":51.8,"level":"High","origin":"GB","value":45678,"dw":2678.0,"mw":3145.0,"dwell":27.3,"hs":"9013","line":"YML","expl":"Minor flags noted (measured weight 17% higher than declared; weekend submission), but overall low risk profile."},{"id":"CONT123468","score":50.5,"level":"High","origin":"JP","value":123456,"dw":5123.0,"mw":4456.0,"dwell":39.6,"hs":"7108","line":"MAERSK","expl":"Minor flags noted (measured weight 13% lower than declared), but overall low risk profile."},{"id":"CONT567245","score":49.2,"level":"Medium","origin":"CA","value":34567,"dw":3789.0,"mw":4234.0,"dwell":22.8,"hs":"8542","line":"MSC","expl":"All shipment parameters within normal ranges. Standard clearance applicable."},{"id":"CONT789356","score":48.7,"level":"Medium","origin":"AU","value":89012,"dw":7234.0,"mw":6789.0,"dwell":18.4,"hs":"2933","line":"CMA CGM","expl":"All shipment parameters within normal ranges. Standard clearance applicable."},{"id":"CONT234574","score":47.5,"level":"Medium","origin":"SG","value":156789,"dw":4567.0,"mw":5123.0,"dwell":29.1,"hs":"8471","line":"COSCO","expl":"All shipment parameters within normal ranges. Standard clearance applicable."},{"id":"CONT891247","score":46.3,"level":"Medium","origin":"NL","value":67890,"dw":2901.0,"mw":2567.0,"dwell":15.7,"hs":"8517","line":"EVERGREEN","expl":"All shipment parameters within normal ranges. Standard clearance applicable."},{"id":"CONT456802","score":45.8,"level":"Medium","origin":"CH","value":98765,"dw":8901.0,"mw":9678.0,"dwell":33.5,"hs":"8703","line":"HAPAG","expl":"Minor flags noted (measured weight 9% higher than declared), but overall low risk profile."},{"id":"CONT678925","score":44.6,"level":"Medium","origin":"US","value":45678,"dw":3456.0,"mw":3123.0,"dwell":21.2,"hs":"6110","line":"ONE","expl":"All shipment parameters within normal ranges. Standard clearance applicable."},{"id":"CONT345692","score":43.4,"level":"Medium","origin":"DE","value":178901,"dw":6789.0,"mw":7345.0,"dwell":27.8,"hs":"2710","line":"YML","expl":"Minor flags noted (measured weight 8% higher than declared), but overall low risk profile."},{"id":"CONT901247","score":42.9,"level":"Medium","origin":"FR","value":89012,"dw":2345.0,"mw":2089.0,"dwell":18.9,"hs":"9013","line":"MAERSK","expl":"All shipment parameters within normal ranges. Standard clearance applicable."},{"id":"CONT123471","score":41.7,"level":"Medium","origin":"GB","value":34567,"dw":5678.0,"mw":6123.0,"dwell":34.2,"hs":"7108","line":"MSC","expl":"Minor flags noted (measured weight 8% higher than declared), but overall low risk profile."},{"id":"CONT567248","score":40.5,"level":"Medium","origin":"JP","value":156789,"dw":8901.0,"mw":8234.0,"dwell":23.6,"hs":"8542","line":"CMA CGM","expl":"All shipment parameters within normal ranges. Standard clearance applicable."},{"id":"CONT789359","score":16.3,"level":"Low","origin":"CA","value":23456,"dw":3456.0,"mw":3534.0,"dwell":24.1,"hs":"8471","line":"COSCO","expl":"All shipment parameters within normal ranges. Standard clearance applicable."},{"id":"CONT234577","score":14.8,"level":"Low","origin":"AU","value":67890,"dw":7890.0,"mw":7990.0,"dwell":18.7,"hs":"8517","line":"EVERGREEN","expl":"All shipment parameters within normal ranges. Standard clearance applicable."},{"id":"CONT891250","score":12.9,"level":"Low","origin":"SG","value":123456,"dw":4567.0,"mw":4623.0,"dwell":22.4,"hs":"8703","line":"HAPAG","expl":"All shipment parameters within normal ranges. Standard clearance applicable."},{"id":"CONT456805","score":11.4,"level":"Low","origin":"NL","value":56789,"dw":2901.0,"mw":2934.0,"dwell":19.8,"hs":"6110","line":"ONE","expl":"All shipment parameters within normal ranges. Standard clearance applicable."},{"id":"CONT678928","score":9.7,"level":"Low","origin":"US","value":89012,"dw":6789.0,"mw":6812.0,"dwell":28.3,"hs":"2710","line":"YML","expl":"All shipment parameters within normal ranges. Standard clearance applicable."},{"id":"CONT345695","score":8.2,"level":"Low","origin":"DE","value":34567,"dw":3456.0,"mw":3501.0,"dwell":16.9,"hs":"9013","line":"MAERSK","expl":"All shipment parameters within normal ranges. Standard clearance applicable."},{"id":"CONT901250","score":6.8,"level":"Low","origin":"CH","value":145678,"dw":8901.0,"mw":8956.0,"dwell":31.2,"hs":"7108","line":"MSC","expl":"All shipment parameters within normal ranges. Standard clearance applicable."},{"id":"CONT123474","score":5.3,"level":"Low","origin":"GB","value":67890,"dw":5678.0,"mw":5712.0,"dwell":25.7,"hs":"8542","line":"CMA CGM","expl":"All shipment parameters within normal ranges. Standard clearance applicable."},{"id":"CONT567251","score":4.1,"level":"Low","origin":"FR","value":23456,"dw":2345.0,"mw":2367.0,"dwell":21.3,"hs":"2933","line":"COSCO","expl":"All shipment parameters within normal ranges. Standard clearance applicable."},{"id":"CONT789362","score":2.8,"level":"Low","origin":"JP","value":98765,"dw":4567.0,"mw":4589.0,"dwell":27.6,"hs":"8471","line":"EVERGREEN","expl":"All shipment parameters within normal ranges. Standard clearance applicable."}];

const LEVEL_CONFIG = {
  Critical: { color: "#ef4444", bg: "bg-red-950", border: "border-red-800", text: "text-red-400", badge: "bg-red-900 text-red-300 border-red-700" },
  High:     { color: "#f97316", bg: "bg-orange-950", border: "border-orange-800", text: "text-orange-400", badge: "bg-orange-900 text-orange-300 border-orange-700" },
  Medium:   { color: "#eab308", bg: "bg-yellow-950", border: "border-yellow-800", text: "text-yellow-400", badge: "bg-yellow-900 text-yellow-300 border-yellow-700" },
  Low:      { color: "#22c55e", bg: "bg-green-950", border: "border-green-800", text: "text-green-400", badge: "bg-green-900 text-green-300 border-green-700" },
};

const LEVEL_ORDER = ["Critical", "High", "Medium", "Low"];

function ScoreBadge({ level, score }) {
  const cfg = LEVEL_CONFIG[level];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-mono font-bold border ${cfg.badge}`}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.color }} />
      {level} · {score}
    </span>
  );
}

function StatCard({ label, value, color, sub }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 flex flex-col gap-1">
      <p className="text-xs text-slate-500 uppercase tracking-widest font-medium">{label}</p>
      <p className="text-3xl font-black" style={{ color }}>{value}</p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

const CUSTOM_TOOLTIP = ({ active, payload }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 text-xs shadow-xl">
        <p className="text-slate-200 font-semibold">{payload[0].name}</p>
        <p className="text-slate-300">{payload[0].value} containers</p>
      </div>
    );
  }
  return null;
};

function ContainerModal({ container, onClose }) {
  if (!container) return null;
  const cfg = LEVEL_CONFIG[container.level];
  const weightDiff = ((container.mw - container.dw) / container.dw * 100).toFixed(1);
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className={`p-5 rounded-t-2xl border-b ${cfg.bg} ${cfg.border}`}>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-slate-400 font-mono mb-1">CONTAINER ID</p>
              <p className="text-xl font-bold text-white font-mono">{container.id}</p>
            </div>
            <ScoreBadge level={container.level} score={container.score} />
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div className={`rounded-lg p-3 border text-sm ${cfg.bg} ${cfg.border} ${cfg.text}`}>
            {container.expl}
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              ["Origin", container.origin],
              ["Shipping Line", container.line],
              ["HS Code", container.hs],
              ["Dwell Time", `${container.dwell} hrs`],
              ["Declared Value", `$${container.value.toLocaleString()}`],
              ["Declared Weight", `${container.dw.toLocaleString()} kg`],
              ["Measured Weight", `${container.mw.toLocaleString()} kg`],
              ["Weight Δ", `${weightDiff > 0 ? "+" : ""}${weightDiff}%`],
            ].map(([k, v]) => (
              <div key={k} className="bg-slate-800/60 rounded-lg p-2.5">
                <p className="text-slate-500 text-xs mb-0.5">{k}</p>
                <p className="text-slate-200 font-medium">{v}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="px-5 pb-5">
          <button onClick={onClose} className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [filterLevel, setFilterLevel] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("score");
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState("table");
  const [uploadedData, setUploadedData] = useState(null);

  const data = uploadedData || SAMPLE_DATA;

  const summary = useMemo(() => ({
    total:    data.length,
    critical: data.filter(d => d.level === "Critical").length,
    high:     data.filter(d => d.level === "High").length,
    medium:   data.filter(d => d.level === "Medium").length,
    low:      data.filter(d => d.level === "Low").length,
    avgScore: (data.reduce((a, b) => a + b.score, 0) / data.length).toFixed(1),
  }), [data]);

  const pieData = useMemo(() => LEVEL_ORDER.map(l => ({
    name: l,
    value: data.filter(d => d.level === l).length,
    color: LEVEL_CONFIG[l].color,
  })).filter(d => d.value > 0), [data]);

  const barData = useMemo(() => {
    const origins = {};
    data.filter(d => d.level === "Critical" || d.level === "High").forEach(d => {
      origins[d.origin] = (origins[d.origin] || 0) + 1;
    });
    return Object.entries(origins).sort((a,b) => b[1]-a[1]).slice(0, 8).map(([k, v]) => ({ name: k, value: v }));
  }, [data]);

  const scoreDistData = useMemo(() => {
    const buckets = Array.from({ length: 10 }, (_, i) => ({ range: `${i*10}–${i*10+9}`, count: 0 }));
    data.forEach(d => {
      const idx = Math.min(9, Math.floor(d.score / 10));
      buckets[idx].count++;
    });
    return buckets;
  }, [data]);

  const filtered = useMemo(() => {
    let d = data;
    if (filterLevel !== "All") d = d.filter(x => x.level === filterLevel);
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      d = d.filter(x => x.id.toLowerCase().includes(q) || x.origin.toLowerCase().includes(q) || x.line.toLowerCase().includes(q) || x.hs.includes(q));
    }
    d = [...d].sort((a, b) => {
      if (sortBy === "score") return b.score - a.score;
      if (sortBy === "value") return b.value - a.value;
      if (sortBy === "dwell") return b.dwell - a.dwell;
      return 0;
    });
    return d;
  }, [data, filterLevel, searchTerm, sortBy]);

  const handleFileUpload = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target.result;
        const lines = text.split('\n').filter(Boolean);
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const rows = lines.slice(1).map(line => {
          const vals = line.split(',').map(v => v.trim().replace(/"/g, ''));
          const obj = {};
          headers.forEach((h, i) => obj[h] = vals[i] || '');
          return {
            id:    obj['Container_ID'] || obj['id'] || `ROW_${Math.random().toString(36).slice(2,7)}`,
            score: parseFloat(obj['Risk_Score'] || obj['score'] || 0),
            level: obj['Risk_Level'] || obj['level'] || 'Low',
            origin: obj['Origin_Country'] || obj['origin'] || 'N/A',
            value: parseFloat(obj['Declared_Value'] || obj['value'] || 0),
            dw:    parseFloat(obj['Declared_Weight'] || obj['dw'] || 0),
            mw:    parseFloat(obj['Measured_Weight'] || obj['mw'] || 0),
            dwell: parseFloat(obj['Dwell_Time_Hours'] || obj['dwell'] || 0),
            hs:    obj['HS_Code'] || obj['hs'] || 'N/A',
            line:  obj['Shipping_Line'] || obj['line'] || 'N/A',
            expl:  obj['Explanation_Summary'] || obj['expl'] || 'No explanation available.',
          };
        });
        setUploadedData(rows);
        setFilterLevel("All");
        setSearchTerm("");
      } catch (err) {
        alert("Error parsing CSV. Please ensure it has the correct columns.");
      }
    };
    reader.readAsText(file);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-lg font-black text-white shadow-lg">⛶</div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight leading-none">CUSTOMS RISK INTEL</h1>
              <p className="text-xs text-slate-500 leading-none mt-0.5">AI-Powered Container Risk Assessment</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="cursor-pointer flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors">
              <span>⬆</span> Upload CSV
              <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
            </label>
            {uploadedData && (
              <button onClick={() => setUploadedData(null)} className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors">
                ← Sample Data
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard label="Total Containers" value={summary.total.toLocaleString()} color="#94a3b8" />
          <StatCard label="Avg Risk Score" value={summary.avgScore} color="#60a5fa" sub="out of 100" />
          <StatCard label="Critical" value={summary.critical} color="#ef4444" sub={`${((summary.critical/summary.total)*100).toFixed(0)}% of total`} />
          <StatCard label="High" value={summary.high} color="#f97316" sub={`${((summary.high/summary.total)*100).toFixed(0)}% of total`} />
          <StatCard label="Medium" value={summary.medium} color="#eab308" sub={`${((summary.medium/summary.total)*100).toFixed(0)}% of total`} />
          <StatCard label="Low / Clear" value={summary.low} color="#22c55e" sub={`${((summary.low/summary.total)*100).toFixed(0)}% of total`} />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Pie */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <p className="text-sm font-semibold text-slate-300 mb-4">Risk Level Distribution</p>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                  {pieData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                </Pie>
                <Tooltip content={<CUSTOM_TOOLTIP />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 mt-2">
              {pieData.map(d => (
                <span key={d.name} className="text-xs flex items-center gap-1 text-slate-400">
                  <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                  {d.name} ({d.value})
                </span>
              ))}
            </div>
          </div>

          {/* Score Distribution */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <p className="text-sm font-semibold text-slate-300 mb-4">Score Distribution</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={scoreDistData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                <XAxis dataKey="range" tick={{ fontSize: 9, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 9, fill: '#64748b' }} />
                <Tooltip content={<CUSTOM_TOOLTIP />} />
                <Bar dataKey="count" name="Containers" radius={[3, 3, 0, 0]}>
                  {scoreDistData.map((entry, index) => {
                    const score = index * 10;
                    const color = score >= 75 ? "#ef4444" : score >= 50 ? "#f97316" : score >= 25 ? "#eab308" : "#22c55e";
                    return <Cell key={index} fill={color} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top Risk Origins */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <p className="text-sm font-semibold text-slate-300 mb-4">High-Risk Origins</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={barData} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 10 }}>
                <XAxis type="number" tick={{ fontSize: 9, fill: '#64748b' }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} width={30} />
                <Tooltip content={<CUSTOM_TOOLTIP />} />
                <Bar dataKey="value" name="Flagged" fill="#ef4444" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Table section */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          {/* Toolbar */}
          <div className="p-4 border-b border-slate-800 flex flex-wrap gap-3 items-center">
            <div className="flex-1 min-w-48">
              <input
                type="text"
                placeholder="Search by ID, origin, HS code, shipping line…"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {["All", ...LEVEL_ORDER].map(l => (
                <button
                  key={l}
                  onClick={() => setFilterLevel(l)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                    filterLevel === l
                      ? l === "All" ? "bg-blue-600 text-white border-blue-500" : `${LEVEL_CONFIG[l]?.bg || ''} ${LEVEL_CONFIG[l]?.text || ''} border-current`
                      : "bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500"
                  }`}
                >
                  {l} {l !== "All" && `(${summary[l.toLowerCase()]})`}
                </button>
              ))}
            </div>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none"
            >
              <option value="score">Sort: Risk Score</option>
              <option value="value">Sort: Declared Value</option>
              <option value="dwell">Sort: Dwell Time</option>
            </select>
            <p className="text-xs text-slate-500">{filtered.length} results</p>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-xs text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-3 text-left font-semibold">Container ID</th>
                  <th className="px-4 py-3 text-left font-semibold">Risk</th>
                  <th className="px-4 py-3 text-left font-semibold">Origin</th>
                  <th className="px-4 py-3 text-left font-semibold hidden md:table-cell">Declared Value</th>
                  <th className="px-4 py-3 text-left font-semibold hidden lg:table-cell">Weight Δ</th>
                  <th className="px-4 py-3 text-left font-semibold hidden lg:table-cell">Dwell (hrs)</th>
                  <th className="px-4 py-3 text-left font-semibold hidden xl:table-cell">Explanation</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 80).map((row, i) => {
                  const weightDiff = row.dw > 0 ? ((row.mw - row.dw) / row.dw * 100).toFixed(0) : 0;
                  const cfg = LEVEL_CONFIG[row.level];
                  return (
                    <tr
                      key={row.id}
                      className={`border-b border-slate-800/50 cursor-pointer transition-colors ${i % 2 === 0 ? 'bg-slate-900' : 'bg-slate-900/50'} hover:bg-slate-800`}
                      onClick={() => setSelected(row)}
                    >
                      <td className="px-4 py-3 font-mono text-slate-300 font-semibold text-xs">{row.id}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${row.score}%`, background: cfg.color }} />
                          </div>
                          <ScoreBadge level={row.level} score={row.score} />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-slate-800 rounded text-slate-300 text-xs font-mono font-semibold">
                          {row.origin}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 hidden md:table-cell">${row.value.toLocaleString()}</td>
                      <td className={`px-4 py-3 font-mono font-semibold text-xs hidden lg:table-cell ${Math.abs(weightDiff) > 20 ? 'text-orange-400' : 'text-slate-400'}`}>
                        {weightDiff > 0 ? `+${weightDiff}` : weightDiff}%
                      </td>
                      <td className={`px-4 py-3 font-mono text-xs hidden lg:table-cell ${row.dwell > 72 ? 'text-orange-400' : row.dwell < 2 ? 'text-yellow-400' : 'text-slate-400'}`}>
                        {row.dwell}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs max-w-xs truncate hidden xl:table-cell">{row.expl}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="py-16 text-center text-slate-500">
                <p className="text-4xl mb-3">🔍</p>
                <p className="font-medium">No containers match your filters</p>
              </div>
            )}
          </div>

          {filtered.length > 80 && (
            <div className="px-4 py-3 border-t border-slate-800 text-xs text-slate-500 text-center">
              Showing 80 of {filtered.length} results. Upload a new CSV to analyze your full dataset.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-600 pb-4">
          Customs Risk Intel · AI-Powered Anomaly Detection & Classification · Sample data shown · Upload your CSV to analyze real shipments
        </div>
      </div>

      <ContainerModal container={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
