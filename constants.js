module.exports = {
    server : {
        port : 8080,
        compression : true,
        cache : false
    // 86400000
    },

    https : {
        key : './ssl/localhost.key',
        cert : './ssl/localhost.crt',
        port : 8443
    },

    password : {
        iterations : 1000
    },

    db : {
        host : 'localhost',
        schema : 'nodejs_chat'
    },

    log : {
        error : true,
        info : true,
        debug : true,
        db : false
    },

    registrationEmail : {
        from : 'Chat Server <donotreply@spooks.me>',
        subject : 'Registering Chat Nickname',
        text : 'You are registering the nickname {0}.\r\nTo verify your account, all you have to do is type out the following: /verify {1}'
    },

    // emailServer : {
    // user : "username",
    // password : "password",
    // host : "smtp.your-email.com",
    // ssl : true
    // },

    msgs : {
        banned : 'You are banned.',
        pmOffline : 'Cannot pm a nick unless they are online.',
        notRegistered : 'Not registered yet',
        alreadyRegistered : 'Already registered',
        alreadyVerified : 'Already verified',
        invalidCode : 'The verification code provided was incorrect',
        invalidPassword : 'Invalid password',
        invalidEmail : 'Invalid email address',
        invalidAccess : 'Invalid access_level',
        invalidCommand : 'Invalid command',
        invalidCommandParams : 'Invalid command parameters',
        invalidCommandAccess : 'Not permissioned for this command',
        invalidLogin : 'The password you provided was incorrect',
        nickVerified : 'The nick has been taken, please use /login instead',
        nickNotVerified : 'The nick you are attempting to login has not been verified',
        alreadyBeingUsed : 'That nick is already being used by someone else',
        verified : 'You have verified the nick',
        registered : 'You have registered the nick',
        registeredAndVerified : 'You have registered the nick, verification is turned off',
        unregistered : 'You have unregistered the nick',
        banlist : 'Globally banned: {0}',
        channel_banlist : 'Channel banned: {0}',
        access_granted : 'User {0} now has level {1}',
        whoami : 'You are {0} with access_level {1} with ip {2}',
        whois : '{0} has access_level {1} with ip {2}',
        user_doesnt_exist : '{0} does not exist',
        find_ip : 'ip {0} uses: ',
        find_ip_empty : 'Could not find ip {0}',
        banned_channel : '{0} is now banned on this channel',
        banned_global : '{0} is now banned globally',
        unbanned_channel : '{0} is no longer banned on this channel',
        unbanned_global : '{0} is no longer banned globally',
        not_banned_channel : '{0} is not banned on this channel',
        not_banned_global : '{0} is not banned globally',
        already_banned_channel : '{0} is already banned on this channel',
        already_banned_global : '{0} is already banned globally',
        banned_file : '{0} is banned in a file and cannot be unbanned',
        no_banned_channel : 'There is nothing banned on this channel',
        no_banned_global : 'There is nothing banned globally'
    },

    names : [ "AARON", "ABDUL", "ABE", "ABEL", "ABRAHAM", "ABRAM", "ADALBERTO", "ADAM", "ADAN", "ADOLFO", "ADOLPH", "ADRIAN", "AGUSTIN", "AHMAD", "AHMED", "AL", "ALAN", "ALBERT", "ALBERTO", "ALDEN", "ALDO", "ALEC", "ALEJANDRO", "ALEX", "ALEXANDER", "ALEXIS", "ALFONSO", "ALFONZO", "ALFRED", "ALFREDO", "ALI", "ALLAN",
            "ALLEN", "ALONSO", "ALONZO", "ALPHONSE", "ALPHONSO", "ALTON", "ALVA", "ALVARO", "ALVIN", "AMADO", "AMBROSE", "AMOS", "ANDERSON", "ANDRE", "ANDREA", "ANDREAS", "ANDRES", "ANDREW", "ANDY", "ANGEL", "ANGELO", "ANIBAL", "ANTHONY", "ANTIONE", "ANTOINE", "ANTON", "ANTONE", "ANTONIA", "ANTONIO", "ANTONY",
            "ANTWAN", "ARCHIE", "ARDEN", "ARIEL", "ARLEN", "ARLIE", "ARMAND", "ARMANDO", "ARNOLD", "ARNOLDO", "ARNULFO", "ARON", "ARRON", "ART", "ARTHUR", "ARTURO", "ASA", "ASHLEY", "AUBREY", "AUGUST", "AUGUSTINE", "AUGUSTUS", "AURELIO", "AUSTIN", "AVERY", "BARNEY", "BARRETT", "BARRY", "BART", "BARTON", "BASIL",
            "BEAU", "BEN", "BENEDICT", "BENITO", "BENJAMIN", "BENNETT", "BENNIE", "BENNY", "BENTON", "BERNARD", "BERNARDO", "BERNIE", "BERRY", "BERT", "BERTRAM", "BILL", "BILLIE", "BILLY", "BLAINE", "BLAIR", "BLAKE", "BO", "BOB", "BOBBIE", "BOBBY", "BOOKER", "BORIS", "BOYCE", "BOYD", "BRAD", "BRADFORD", "BRADLEY",
            "BRADLY", "BRADY", "BRAIN", "BRANDEN", "BRANDON", "BRANT", "BRENDAN", "BRENDON", "BRENT", "BRENTON", "BRET", "BRETT", "BRIAN", "BRICE", "BRITT", "BROCK", "BRODERICK", "BROOKS", "BRUCE", "BRUNO", "BRYAN", "BRYANT", "BRYCE", "BRYON", "BUCK", "BUD", "BUDDY", "BUFORD", "BURL", "BURT", "BURTON", "BUSTER",
            "BYRON", "CALEB", "CALVIN", "CAMERON", "CAREY", "CARL", "CARLO", "CARLOS", "CARLTON", "CARMELO", "CARMEN", "CARMINE", "CAROL", "CARROL", "CARROLL", "CARSON", "CARTER", "CARY", "CASEY", "CECIL", "CEDRIC", "CEDRICK", "CESAR", "CHAD", "CHADWICK", "CHANCE", "CHANG", "CHARLES", "CHARLEY", "CHARLIE", "CHAS",
            "CHASE", "CHAUNCEY", "CHESTER", "CHET", "CHI", "CHONG", "CHRIS", "CHRISTIAN", "CHRISTOPER", "CHRISTOPHER", "CHUCK", "CHUNG", "CLAIR", "CLARENCE", "CLARK", "CLAUD", "CLAUDE", "CLAUDIO", "CLAY", "CLAYTON", "CLEMENT", "CLEMENTE", "CLEO", "CLETUS", "CLEVELAND", "CLIFF", "CLIFFORD", "CLIFTON", "CLINT",
            "CLINTON", "CLYDE", "CODY", "COLBY", "COLE", "COLEMAN", "COLIN", "COLLIN", "COLTON", "COLUMBUS", "CONNIE", "CONRAD", "CORDELL", "COREY", "CORNELIUS", "CORNELL", "CORTEZ", "CORY", "COURTNEY", "COY", "CRAIG", "CRISTOBAL", "CRISTOPHER", "CRUZ", "CURT", "CURTIS", "CYRIL", "CYRUS", "DALE", "DALLAS", "DALTON",
            "DAMIAN", "DAMIEN", "DAMION", "DAMON", "DAN", "DANA", "DANE", "DANIAL", "DANIEL", "DANILO", "DANNIE", "DANNY", "DANTE", "DARELL", "DAREN", "DARIN", "DARIO", "DARIUS", "DARNELL", "DARON", "DARREL", "DARRELL", "DARREN", "DARRICK", "DARRIN", "DARRON", "DARRYL", "DARWIN", "DARYL", "DAVE", "DAVID", "DAVIS",
            "DEAN", "DEANDRE", "DEANGELO", "DEE", "DEL", "DELBERT", "DELMAR", "DELMER", "DEMARCUS", "DEMETRIUS", "DENIS", "DENNIS", "DENNY", "DENVER", "DEON", "DEREK", "DERICK", "DERRICK", "DESHAWN", "DESMOND", "DEVIN", "DEVON", "DEWAYNE", "DEWEY", "DEWITT", "DEXTER", "DICK", "DIEGO", "DILLON", "DINO", "DION", "DIRK",
            "DOMENIC", "DOMINGO", "DOMINIC", "DOMINICK", "DOMINIQUE", "DON", "DONALD", "DONG", "DONN", "DONNELL", "DONNIE", "DONNY", "DONOVAN", "DONTE", "DORIAN", "DORSEY", "DOUG", "DOUGLAS", "DOUGLASS", "DOYLE", "DREW", "DUANE", "DUDLEY", "DUNCAN", "DUSTIN", "DUSTY", "DWAIN", "DWAYNE", "DWIGHT", "DYLAN", "EARL",
            "EARLE", "EARNEST", "ED", "EDDIE", "EDDY", "EDGAR", "EDGARDO", "EDISON", "EDMOND", "EDMUND", "EDMUNDO", "EDUARDO", "EDWARD", "EDWARDO", "EDWIN", "EFRAIN", "EFREN", "ELBERT", "ELDEN", "ELDON", "ELDRIDGE", "ELI", "ELIAS", "ELIJAH", "ELISEO", "ELISHA", "ELLIOT", "ELLIOTT", "ELLIS", "ELLSWORTH", "ELMER",
            "ELMO", "ELOY", "ELROY", "ELTON", "ELVIN", "ELVIS", "ELWOOD", "EMANUEL", "EMERSON", "EMERY", "EMIL", "EMILE", "EMILIO", "EMMANUEL", "EMMETT", "EMMITT", "EMORY", "ENOCH", "ENRIQUE", "ERASMO", "ERIC", "ERICH", "ERICK", "ERIK", "ERIN", "ERNEST", "ERNESTO", "ERNIE", "ERROL", "ERVIN", "ERWIN", "ESTEBAN",
            "ETHAN", "EUGENE", "EUGENIO", "EUSEBIO", "EVAN", "EVERETT", "EVERETTE", "EZEKIEL", "EZEQUIEL", "EZRA", "FABIAN", "FAUSTINO", "FAUSTO", "FEDERICO", "FELIPE", "FELIX", "FELTON", "FERDINAND", "FERMIN", "FERNANDO", "FIDEL", "FILIBERTO", "FLETCHER", "FLORENCIO", "FLORENTINO", "FLOYD", "FOREST", "FORREST",
            "FOSTER", "FRANCES", "FRANCESCO", "FRANCIS", "FRANCISCO", "FRANK", "FRANKIE", "FRANKLIN", "FRANKLYN", "FRED", "FREDDIE", "FREDDY", "FREDERIC", "FREDERICK", "FREDRIC", "FREDRICK", "FREEMAN", "FRITZ", "GABRIEL", "GAIL", "GALE", "GALEN", "GARFIELD", "GARLAND", "GARRET", "GARRETT", "GARRY", "GARTH", "GARY",
            "GASTON", "GAVIN", "GAYLE", "GAYLORD", "GENARO", "GENE", "GEOFFREY", "GEORGE", "GERALD", "GERALDO", "GERARD", "GERARDO", "GERMAN", "GERRY", "GIL", "GILBERT", "GILBERTO", "GINO", "GIOVANNI", "GIUSEPPE", "GLEN", "GLENN", "GONZALO", "GORDON", "GRADY", "GRAHAM", "GRAIG", "GRANT", "GRANVILLE", "GREG", "GREGG",
            "GREGORIO", "GREGORY", "GROVER", "GUADALUPE", "GUILLERMO", "GUS", "GUSTAVO", "GUY", "HAI", "HAL", "HANK", "HANS", "HARLAN", "HARLAND", "HARLEY", "HAROLD", "HARRIS", "HARRISON", "HARRY", "HARVEY", "HASSAN", "HAYDEN", "HAYWOOD", "HEATH", "HECTOR", "HENRY", "HERB", "HERBERT", "HERIBERTO", "HERMAN",
            "HERSCHEL", "HERSHEL", "HILARIO", "HILTON", "HIPOLITO", "HIRAM", "HOBERT", "HOLLIS", "HOMER", "HONG", "HORACE", "HORACIO", "HOSEA", "HOUSTON", "HOWARD", "HOYT", "HUBERT", "HUEY", "HUGH", "HUGO", "HUMBERTO", "HUNG", "HUNTER", "HYMAN", "IAN", "IGNACIO", "IKE", "IRA", "IRVIN", "IRVING", "IRWIN", "ISAAC",
            "ISAIAH", "ISAIAS", "ISIAH", "ISIDRO", "ISMAEL", "ISRAEL", "ISREAL", "ISSAC", "IVAN", "IVORY", "JACINTO", "JACK", "JACKIE", "JACKSON", "JACOB", "JACQUES", "JAE", "JAIME", "JAKE", "JAMAAL", "JAMAL", "JAMAR", "JAME", "JAMEL", "JAMES", "JAMEY", "JAMIE", "JAMISON", "JAN", "JARED", "JAROD", "JARRED", "JARRETT",
            "JARROD", "JARVIS", "JASON", "JASPER", "JAVIER", "JAY", "JAYSON", "JC", "JEAN", "JED", "JEFF", "JEFFEREY", "JEFFERSON", "JEFFERY", "JEFFREY", "JEFFRY", "JERALD", "JERAMY", "JERE", "JEREMIAH", "JEREMY", "JERMAINE", "JEROLD", "JEROME", "JEROMY", "JERRELL", "JERROD", "JERROLD", "JERRY", "JESS", "JESSE",
            "JESSIE", "JESUS", "JEWEL", "JEWELL", "JIM", "JIMMIE", "JIMMY", "JOAN", "JOAQUIN", "JODY", "JOE", "JOEL", "JOESPH", "JOEY", "JOHN", "JOHNATHAN", "JOHNATHON", "JOHNIE", "JOHNNIE", "JOHNNY", "JOHNSON", "JON", "JONAH", "JONAS", "JONATHAN", "JONATHON", "JORDAN", "JORDON", "JORGE", "JOSE", "JOSEF", "JOSEPH",
            "JOSH", "JOSHUA", "JOSIAH", "JOSPEH", "JOSUE", "JUAN", "JUDE", "JUDSON", "JULES", "JULIAN", "JULIO", "JULIUS", "JUNIOR", "JUSTIN", "KAREEM", "KARL", "KASEY", "KEENAN", "KEITH", "KELLEY", "KELLY", "KELVIN", "KEN", "KENDALL", "KENDRICK", "KENETH", "KENNETH", "KENNITH", "KENNY", "KENT", "KENTON", "KERMIT",
            "KERRY", "KEVEN", "KEVIN", "KIETH", "KIM", "KING", "KIP", "KIRBY", "KIRK", "KOREY", "KORY", "KRAIG", "KRIS", "KRISTOFER", "KRISTOPHER", "KURT", "KURTIS", "KYLE", "LACY", "LAMAR", "LAMONT", "LANCE", "LANDON", "LANE", "LANNY", "LARRY", "LAUREN", "LAURENCE", "LAVERN", "LAVERNE", "LAWERENCE", "LAWRENCE",
            "LAZARO", "LEANDRO", "LEE", "LEIF", "LEIGH", "LELAND", "LEMUEL", "LEN", "LENARD", "LENNY", "LEO", "LEON", "LEONARD", "LEONARDO", "LEONEL", "LEOPOLDO", "LEROY", "LES", "LESLEY", "LESLIE", "LESTER", "LEVI", "LEWIS", "LINCOLN", "LINDSAY", "LINDSEY", "LINO", "LINWOOD", "LIONEL", "LLOYD", "LOGAN", "LON",
            "LONG", "LONNIE", "LONNY", "LOREN", "LORENZO", "LOU", "LOUIE", "LOUIS", "LOWELL", "LOYD", "LUCAS", "LUCIANO", "LUCIEN", "LUCIO", "LUCIUS", "LUIGI", "LUIS", "LUKE", "LUPE", "LUTHER", "LYLE", "LYMAN", "LYNDON", "LYNN", "LYNWOOD", "MAC", "MACK", "MAJOR", "MALCOLM", "MALCOM", "MALIK", "MAN", "MANUAL",
            "MANUEL", "MARC", "MARCEL", "MARCELINO", "MARCELLUS", "MARCELO", "MARCO", "MARCOS", "MARCUS", "MARGARITO", "MARIA", "MARIANO", "MARIO", "MARION", "MARK", "MARKUS", "MARLIN", "MARLON", "MARQUIS", "MARSHALL", "MARTIN", "MARTY", "MARVIN", "MARY", "MASON", "MATHEW", "MATT", "MATTHEW", "MAURICE", "MAURICIO",
            "MAURO", "MAX", "MAXIMO", "MAXWELL", "MAYNARD", "MCKINLEY", "MEL", "MELVIN", "MERLE", "MERLIN", "MERRILL", "MERVIN", "MICAH", "MICHAEL", "MICHAL", "MICHALE", "MICHEAL", "MICHEL", "MICKEY", "MIGUEL", "MIKE", "MIKEL", "MILAN", "MILES", "MILFORD", "MILLARD", "MILO", "MILTON", "MINH", "MIQUEL", "MITCH",
            "MITCHEL", "MITCHELL", "MODESTO", "MOHAMED", "MOHAMMAD", "MOHAMMED", "MOISES", "MONROE", "MONTE", "MONTY", "MORGAN", "MORRIS", "MORTON", "MOSE", "MOSES", "MOSHE", "MURRAY", "MYLES", "MYRON", "NAPOLEON", "NATHAN", "NATHANAEL", "NATHANIAL", "NATHANIEL", "NEAL", "NED", "NEIL", "NELSON", "NESTOR", "NEVILLE",
            "NEWTON", "NICHOLAS", "NICK", "NICKOLAS", "NICKY", "NICOLAS", "NIGEL", "NOAH", "NOBLE", "NOE", "NOEL", "NOLAN", "NORBERT", "NORBERTO", "NORMAN", "NORMAND", "NORRIS", "NUMBERS", "OCTAVIO", "ODELL", "ODIS", "OLEN", "OLIN", "OLIVER", "OLLIE", "OMAR", "OMER", "OREN", "ORLANDO", "ORVAL", "ORVILLE", "OSCAR",
            "OSVALDO", "OSWALDO", "OTHA", "OTIS", "OTTO", "OWEN", "PABLO", "PALMER", "PARIS", "PARKER", "PASQUALE", "PAT", "PATRICIA", "PATRICK", "PAUL", "PEDRO", "PERCY", "PERRY", "PETE", "PETER", "PHIL", "PHILIP", "PHILLIP", "PIERRE", "PORFIRIO", "PORTER", "PRESTON", "PRINCE", "QUENTIN", "QUINCY", "QUINN",
            "QUINTIN", "QUINTON", "RAFAEL", "RALEIGH", "RALPH", "RAMIRO", "RAMON", "RANDAL", "RANDALL", "RANDELL", "RANDOLPH", "RANDY", "RAPHAEL", "RASHAD", "RAUL", "RAY", "RAYFORD", "RAYMON", "RAYMOND", "RAYMUNDO", "REED", "REFUGIO", "REGGIE", "REGINALD", "REID", "REINALDO", "RENALDO", "RENATO", "RENE", "REUBEN",
            "REX", "REY", "REYES", "REYNALDO", "RHETT", "RICARDO", "RICH", "RICHARD", "RICHIE", "RICK", "RICKEY", "RICKIE", "RICKY", "RICO", "RIGOBERTO", "RILEY", "ROB", "ROBBIE", "ROBBY", "ROBERT", "ROBERTO", "ROBIN", "ROBT", "ROCCO", "ROCKY", "ROD", "RODERICK", "RODGER", "RODNEY", "RODOLFO", "RODRICK", "RODRIGO",
            "ROGELIO", "ROGER", "ROLAND", "ROLANDO", "ROLF", "ROLLAND", "ROMAN", "ROMEO", "RON", "RONALD", "RONNIE", "RONNY", "ROOSEVELT", "RORY", "ROSARIO", "ROSCOE", "ROSENDO", "ROSS", "ROY", "ROYAL", "ROYCE", "RUBEN", "RUBIN", "RUDOLF", "RUDOLPH", "RUDY", "RUEBEN", "RUFUS", "RUPERT", "RUSS", "RUSSEL", "RUSSELL",
            "RUSTY", "RYAN", "SAL", "SALVADOR", "SALVATORE", "SAM", "SAMMIE", "SAMMY", "SAMUAL", "SAMUEL", "SANDY", "SANFORD", "SANG", "SANTIAGO", "SANTO", "SANTOS", "SAUL", "SCOT", "SCOTT", "SCOTTIE", "SCOTTY", "SEAN", "SEBASTIAN", "SERGIO", "SETH", "SEYMOUR", "SHAD", "SHANE", "SHANNON", "SHAUN", "SHAWN", "SHAYNE",
            "SHELBY", "SHELDON", "SHELTON", "SHERMAN", "SHERWOOD", "SHIRLEY", "SHON", "SID", "SIDNEY", "SILAS", "SIMON", "SOL", "SOLOMON", "SON", "SONNY", "SPENCER", "STACEY", "STACY", "STAN", "STANFORD", "STANLEY", "STANTON", "STEFAN", "STEPHAN", "STEPHEN", "STERLING", "STEVE", "STEVEN", "STEVIE", "STEWART",
            "STUART", "SUNG", "SYDNEY", "SYLVESTER", "TAD", "TANNER", "TAYLOR", "TED", "TEDDY", "TEODORO", "TERENCE", "TERRANCE", "TERRELL", "TERRENCE", "TERRY", "THAD", "THADDEUS", "THANH", "THEO", "THEODORE", "THERON", "THOMAS", "THURMAN", "TIM", "TIMMY", "TIMOTHY", "TITUS", "TOBIAS", "TOBY", "TOD", "TODD", "TOM",
            "TOMAS", "TOMMIE", "TOMMY", "TONEY", "TONY", "TORY", "TRACEY", "TRACY", "TRAVIS", "TRENT", "TRENTON", "TREVOR", "TREY", "TRINIDAD", "TRISTAN", "TROY", "TRUMAN", "TUAN", "TY", "TYLER", "TYREE", "TYRELL", "TYRON", "TYRONE", "TYSON", "ULYSSES", "VAL", "VALENTIN", "VALENTINE", "VAN", "VANCE", "VAUGHN", "VERN",
            "VERNON", "VICENTE", "VICTOR", "VINCE", "VINCENT", "VINCENZO", "VIRGIL", "VIRGILIO", "VITO", "VON", "WADE", "WALDO", "WALKER", "WALLACE", "WALLY", "WALTER", "WALTON", "WARD", "WARNER", "WARREN", "WAYLON", "WAYNE", "WELDON", "WENDELL", "WERNER", "WES", "WESLEY", "WESTON", "WHITNEY", "WILBER", "WILBERT",
            "WILBUR", "WILBURN", "WILEY", "WILFORD", "WILFRED", "WILFREDO", "WILL", "WILLARD", "WILLIAM", "WILLIAMS", "WILLIAN", "WILLIE", "WILLIS", "WILLY", "WILMER", "WILSON", "WILTON", "WINFORD", "WINFRED", "WINSTON", "WM", "WOODROW", "WYATT", "XAVIER", "YONG", "YOUNG", "ZACHARIAH", "ZACHARY", "ZACHERY", "ZACK",
            "ZACKARY", "ZANE" ]
};

module.exports.msgs.get = function(key) {
    var value = this[key];
    if (value) {
        for ( var i = 1; i < arguments.length; i++) {
            value = value.replace('{' + (i - 1) + '}', arguments[i]);
        }
    }
    return value;
};
