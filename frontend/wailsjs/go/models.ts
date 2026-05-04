export namespace domain {
	
	export class Favorite {
	    ip: string;
	    gamePort: number;
	    queryPort: number;
	    label?: string;
	    name?: string;
	    mapName?: string;
	    perspective?: string;
	    provider?: string;
	    modded?: boolean;
	    inGameTime?: string;
	    queueSize?: number;
	    players?: number;
	    maxPlayers?: number;
	    ping?: number;
	    distanceLabel?: string;
	    workshopModIds?: string[];
	    passwordRequired?: boolean;
	
	    static createFrom(source: any = {}) {
	        return new Favorite(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.ip = source["ip"];
	        this.gamePort = source["gamePort"];
	        this.queryPort = source["queryPort"];
	        this.label = source["label"];
	        this.name = source["name"];
	        this.mapName = source["mapName"];
	        this.perspective = source["perspective"];
	        this.provider = source["provider"];
	        this.modded = source["modded"];
	        this.inGameTime = source["inGameTime"];
	        this.queueSize = source["queueSize"];
	        this.players = source["players"];
	        this.maxPlayers = source["maxPlayers"];
	        this.ping = source["ping"];
	        this.distanceLabel = source["distanceLabel"];
	        this.workshopModIds = source["workshopModIds"];
	        this.passwordRequired = source["passwordRequired"];
	    }
	}
	export class FilterState {
	    exclude1PP: boolean;
	    exclude3PP: boolean;
	    excludeDay: boolean;
	    excludeNight: boolean;
	    excludeEmpty: boolean;
	    excludeFull: boolean;
	    excludeLowPop: boolean;
	    lowPopThresholdPct: number;
	    excludeNonASCII: boolean;
	    deduplicateByName: boolean;
	    excludeOfficial: boolean;
	    excludeUnofficial: boolean;
	    excludeNonModded: boolean;
	    mapEquals: string;
	    searchSubstring: string;
	
	    static createFrom(source: any = {}) {
	        return new FilterState(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.exclude1PP = source["exclude1PP"];
	        this.exclude3PP = source["exclude3PP"];
	        this.excludeDay = source["excludeDay"];
	        this.excludeNight = source["excludeNight"];
	        this.excludeEmpty = source["excludeEmpty"];
	        this.excludeFull = source["excludeFull"];
	        this.excludeLowPop = source["excludeLowPop"];
	        this.lowPopThresholdPct = source["lowPopThresholdPct"];
	        this.excludeNonASCII = source["excludeNonASCII"];
	        this.deduplicateByName = source["deduplicateByName"];
	        this.excludeOfficial = source["excludeOfficial"];
	        this.excludeUnofficial = source["excludeUnofficial"];
	        this.excludeNonModded = source["excludeNonModded"];
	        this.mapEquals = source["mapEquals"];
	        this.searchSubstring = source["searchSubstring"];
	    }
	}
	export class HistoryLine {
	    ip: string;
	    gamePort: number;
	    queryPort: number;
	    name: string;
	    mapName?: string;
	    perspective?: string;
	    provider?: string;
	    atUnix: number;
	
	    static createFrom(source: any = {}) {
	        return new HistoryLine(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.ip = source["ip"];
	        this.gamePort = source["gamePort"];
	        this.queryPort = source["queryPort"];
	        this.name = source["name"];
	        this.mapName = source["mapName"];
	        this.perspective = source["perspective"];
	        this.provider = source["provider"];
	        this.atUnix = source["atUnix"];
	    }
	}
	export class ServerRow {
	    name: string;
	    mapName: string;
	    perspective: string;
	    provider: string;
	    modded: boolean;
	    inGameTime: string;
	    queueSize: number;
	    players: number;
	    maxPlayers: number;
	    address: string;
	    queryPort: number;
	    gamePort: number;
	    queryHost: string;
	    ping: number;
	    distanceLabel: string;
	    steamId?: string;
	    workshopModIds?: string[];
	    modNames?: string[];
	    passwordRequired?: boolean;
	
	    static createFrom(source: any = {}) {
	        return new ServerRow(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.mapName = source["mapName"];
	        this.perspective = source["perspective"];
	        this.provider = source["provider"];
	        this.modded = source["modded"];
	        this.inGameTime = source["inGameTime"];
	        this.queueSize = source["queueSize"];
	        this.players = source["players"];
	        this.maxPlayers = source["maxPlayers"];
	        this.address = source["address"];
	        this.queryPort = source["queryPort"];
	        this.gamePort = source["gamePort"];
	        this.queryHost = source["queryHost"];
	        this.ping = source["ping"];
	        this.distanceLabel = source["distanceLabel"];
	        this.steamId = source["steamId"];
	        this.workshopModIds = source["workshopModIds"];
	        this.modNames = source["modNames"];
	        this.passwordRequired = source["passwordRequired"];
	    }
	}
	export class Settings {
	    playerName: string;
	    steamWebApiKey: string;
	    battlemetricsToken: string;
	    steamLaunchCommand: string;
	    steamRootPath: string;
	    dayZInstallPath?: string;
	    dayZBranch: string;
	    favorites: Favorite[];
	    quickFavorite?: Favorite;
	    quickFavoriteLabel: string;
	    quickFavorites?: Favorite[];
	    history: HistoryLine[];
	    steamCooldownUntil: number;
	    geoIpDatabasePath: string;
	    lanQueryPort: number;
	    clientLat: number;
	    clientLon: number;
	    clientGeoUpdated: number;
	    locale: string;
	    uiTheme: string;
	    uiExternalThemePath?: string;
	    knownMapNames?: string[];
	    workshopModTimeUpdated?: Record<string, number>;
	
	    static createFrom(source: any = {}) {
	        return new Settings(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.playerName = source["playerName"];
	        this.steamWebApiKey = source["steamWebApiKey"];
	        this.battlemetricsToken = source["battlemetricsToken"];
	        this.steamLaunchCommand = source["steamLaunchCommand"];
	        this.steamRootPath = source["steamRootPath"];
	        this.dayZInstallPath = source["dayZInstallPath"];
	        this.dayZBranch = source["dayZBranch"];
	        this.favorites = this.convertValues(source["favorites"], Favorite);
	        this.quickFavorite = this.convertValues(source["quickFavorite"], Favorite);
	        this.quickFavoriteLabel = source["quickFavoriteLabel"];
	        this.quickFavorites = this.convertValues(source["quickFavorites"], Favorite);
	        this.history = this.convertValues(source["history"], HistoryLine);
	        this.steamCooldownUntil = source["steamCooldownUntil"];
	        this.geoIpDatabasePath = source["geoIpDatabasePath"];
	        this.lanQueryPort = source["lanQueryPort"];
	        this.clientLat = source["clientLat"];
	        this.clientLon = source["clientLon"];
	        this.clientGeoUpdated = source["clientGeoUpdated"];
	        this.locale = source["locale"];
	        this.uiTheme = source["uiTheme"];
	        this.uiExternalThemePath = source["uiExternalThemePath"];
	        this.knownMapNames = source["knownMapNames"];
	        this.workshopModTimeUpdated = source["workshopModTimeUpdated"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class SteamKeyValidation {
	    ok: boolean;
	    message: string;
	
	    static createFrom(source: any = {}) {
	        return new SteamKeyValidation(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.ok = source["ok"];
	        this.message = source["message"];
	    }
	}
	export class WorkshopModRow {
	    id: string;
	    name: string;
	    status: string;
	    description: string;
	    previewUrl: string;
	    localSizeBytes: number;
	    remoteSizeBytes: number;
	
	    static createFrom(source: any = {}) {
	        return new WorkshopModRow(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.status = source["status"];
	        this.description = source["description"];
	        this.previewUrl = source["previewUrl"];
	        this.localSizeBytes = source["localSizeBytes"];
	        this.remoteSizeBytes = source["remoteSizeBytes"];
	    }
	}

}

export namespace workshop {
	
	export class Item {
	    id: string;
	    name: string;
	    path: string;
	    sizeBytes: number;
	    metaTimestamp?: number;
	
	    static createFrom(source: any = {}) {
	        return new Item(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.path = source["path"];
	        this.sizeBytes = source["sizeBytes"];
	        this.metaTimestamp = source["metaTimestamp"];
	    }
	}

}

