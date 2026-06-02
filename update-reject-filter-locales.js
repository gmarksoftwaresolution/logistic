const fs = require('fs');
const files = ['mr.json', 'hi.json', 'en.json'];
const translations = {
  mr: {
    'status_rejected': 'नाकारले',
    'reason_payment_issue': 'पेमेंट समस्या',
    'reason_vehicle_issue': 'वाहनाची समस्या',
    'reason_driver_unavailable': 'चालक अनुपलब्ध',
    'reason_traffic_problem': 'वाहतूक समस्या',
    'reason_weather_issue': 'हवामान समस्या',
    'reason_route_problem': 'मार्ग समस्या',
    'reason_other': 'इतर',
    'filter_today': 'आज',
    'filter_1_week': '१ आठवडा',
    'filter_15_days': '१५ दिवस',
    'filter_1_month': '१ महिना',
    'filter_custom_date_range': 'सानुकूल तारीख निवडा'
  },
  hi: {
    'status_rejected': 'अस्वीकृत',
    'reason_payment_issue': 'भुगतान समस्या',
    'reason_vehicle_issue': 'वाहन समस्या',
    'reason_driver_unavailable': 'चालक अनुपलब्ध',
    'reason_traffic_problem': 'यातायात समस्या',
    'reason_weather_issue': 'मौसम की समस्या',
    'reason_route_problem': 'मार्ग समस्या',
    'reason_other': 'अन्य',
    'filter_today': 'आज',
    'filter_1_week': '1 सप्ताह',
    'filter_15_days': '15 दिन',
    'filter_1_month': '1 महीना',
    'filter_custom_date_range': 'कस्टम तारीख सीमा'
  },
  en: {
    'status_rejected': 'Status Rejected',
    'reason_payment_issue': 'Payment Issue',
    'reason_vehicle_issue': 'Vehicle Issue',
    'reason_driver_unavailable': 'Driver Unavailable',
    'reason_traffic_problem': 'Traffic Problem',
    'reason_weather_issue': 'Weather Issue',
    'reason_route_problem': 'Route Problem',
    'reason_other': 'Other',
    'filter_today': 'Filter Today',
    'filter_1_week': 'Filter 1 Week',
    'filter_15_days': 'Filter 15 Days',
    'filter_1_month': 'Filter 1 Month',
    'filter_custom_date_range': 'Filter Custom Date Range'
  }
};

files.forEach(file => {
  const path = 'd:/G-Mark PVT LTD/SHG Delivery/logistic/apps/shg-app/src/locales/' + file;
  let data = JSON.parse(fs.readFileSync(path, 'utf8'));
  const lang = file.split('.')[0];
  Object.assign(data, translations[lang]);
  fs.writeFileSync(path, JSON.stringify(data, null, 2));
});
