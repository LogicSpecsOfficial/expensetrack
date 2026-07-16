const t = {
    title: "最近的香港停車場",
    btnText: "GPS 定位",
    btnFavShow: "我的收藏",
    btnFavHide: "隱藏收藏",
    favTitle: "我的收藏夾",
    searchTitle: "搜尋結果",
    tabOffStreet: "室內停車場",
    tabMetered: "路邊咪錶位",
    gpsLocating: "正在獲取您的位置...",
    apiFetching: "正在讀取停車場數據...",
    addressSearching: "正在搜尋該地址...",
    addressError: "找不到該地址，請嘗試輸入其他關鍵字。",
    gpsError: "定位錯誤: ",
    apiError: "處理數據出錯: ",
    noSupport: "您的瀏覽器不支援地理定位功能。",
    noRecords: "未找到符合條件的地點紀錄。",
    noFavs: "此分類暫無收藏項目。",
    away: "公里外",
    address: "地址",
    district: "地區",
    maxHeight: "最高限高",
    contact: "聯絡電話",
    liveVacancy: "即時空位",
    spaces: "個空位",
    noVacancyData: "無數據",
    distWarning: "[提示: 距離較遠]",
    addFav: "收藏",
    removeFav: "取消收藏",
    optAll: "全部",
    optHideFull: "隱藏已滿車位",
    optEVOnly: "僅顯示充電位",
    optSortVacancy: "空置優先",
    optVacant: "僅顯示空置",
    optOccupied: "僅顯示使用中",
    searchPlaceholder: "搜尋香港地址、大廈、商場或街道...",
    searchBtnText: "搜尋",
    clearBtnText: "清除",
    evBadge: "設有充電設備",
    refreshBtnText: "更新數據",
    dist500m: "500米",
    dist1km: "1公里",
    dist2km: "2公里",
    distAll: "不限距離",
    vacantMeters: "空置咪錶",
    welcomeTitle: "歡迎使用香港停車場搜尋",
    welcomeDesc: "請點擊上方的「GPS 定位」按鈕以尋找附近的停車場，或在搜尋框中直接輸入地址進行搜尋。"
};

const sunIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>`;
const moonIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`;

const synonymMap = {
    "sogo": "銅鑼灣軒尼詩道555號",
    "崇光": "銅鑼灣軒尼詩道555號",
    "ifc": "中環金融街8號",
    "國金": "中環金融街8號",
    "海港城": "尖沙咀廣東道3號",
    "harbourcity": "尖沙咀廣東道3號",
    "朗豪坊": "旺角亞皆老街8號",
    "langhamplace": "旺角亞皆老街8號",
    "apm": "觀塘觀塘道418號",
    "老尖": "尖沙咀",
    "tst": "尖沙咀",
    "mk": "旺角",
    "cwb": "銅鑼灣",
    "時代廣場": "銅鑼灣勿地臣街1號",
    "timessquare": "銅鑼灣勿地臣街1號",
    "新城市廣場": "沙田沙田正街",
    "newtownplaza": "沙田沙田正街",
    "太古廣場": "金鐘金鐘道88號",
    "pacificplace": "金鐘金鐘道88號"
};

// 初始化全局狀態變數
let currentTab = 'offstreet';
let userCoordinates = null;
let cachedAllParks = [];
let cachedAllMeters = [];
let cachedAllToilets = [];
let favorites = JSON.parse(localStorage.getItem('hk_carpark_favs')) || [];
let searchHistory = JSON.parse(localStorage.getItem('hk_carpark_history')) || [];
let activeMeterFilter = 'all';
let activeDistanceFilter = '1';
let offstreetFilters = { hideFull: false, evOnly: false, sortByVacancy: false };
