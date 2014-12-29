var _ = require('underscore');
var fs = require('fs');
var settings;

try {
    var file = fs.readFileSync('./conf/settings.json');
    settings = JSON.parse(file.toString());
} catch (e) {
    throw new Error('Invalid settings: /conf/settings.json invalid or does not exist');
}

module.exports = {
    server : {
        port : 8080,
        compression : true,
        cache : false
    // 86400000
    },

    https : {
        domain : 'this.spooks.me',
        key : './ssl/localhost.key',
        cert : './ssl/localhost.crt',
        port : 8443
    },

    speak : {
        0 : 1,
        1 : 1,
        2 : {
            time : 10000,
            max : 1
        },
        'default' : {
            time : 20000,
            max : 1
        }
    },

    throttle : {
        updateMousePosition : {
            errorMessage : false,
            user : {
                time : 1000,
                max : 100
            },
            channel : {
                time : 1000,
                max : 500
            },
            global : {
                time : 1000,
                max : 1000
            },
            banned : {
                limits : []
            }
        },
        'default' : {
            errorMessage : true,
            user : {
                time : 1000,
                max : 2
            },
            channel : {
                time : 1000,
                max : 10
            },
            global : {
                time : 1000,
                max : 20
            },
            banned : {
                limits : [ {
                    time : 1000,
                    max : 5
                }, {
                    time : 60 * 1000,
                    max : 20
                } ],
                unban : 5 * 60 * 1000
            }
        }
    },

    password : {
        iterations : 1000
    },

    emailRegex : /^[_A-Za-z0-9-\+]+(\.[_A-Za-z0-9-]+)*@[A-Za-z0-9-]+(\.[A-Za-z0-9]+)*(\.[A-Za-z]{2,})$/,

    db : {
        host : 'localhost',
        schema : 'nodejs_chat'
    },

    log : {
        error : true,
        info : true,
        debug : false,
        db : false
    },

    registrationEmail : {
        from : 'Chat Server <donotreply@spooks.me>',
        subject : 'Registering Chat Nickname',
        text : 'You are registering the nickname {0}.\r\nTo verify your account, all you have to do is type out the following: /verify {1}'
    },

    limits : {
        message : 10000,
        nick : 100,
        spoken : 100,
        part : 140
    },

    // emailServer : {
    // user : "username",
    // password : "password",
    // host : "smtp.your-email.com",
    // ssl : true
    // },

    msgs : {
        get : function(key) {
            var value = this[key];
            if (value) {
                for ( var i = 1; i < arguments.length; i++) {
                    value = value.replace('{' + (i - 1) + '}', arguments[i]);
                }
            }
            return value;
        },

        banned : 'You are banned.',
        kicked: 'You have been kicked By: {0}',
        kicked_reason: 'You have been kicked By: {1}, Reason: {0}',
        ghosted: 'Someone else logged in using your username.',
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
        nickNotVerified : 'You cannot login to a nick that was not registered or verified',
        change_password_login : 'You must register before you can change the password',
        alreadyBeingUsed : 'That nick is already being used by someone else',
        verified : 'You have verified the nick',
        registered : 'You have registered the nick',
        registeredAndVerified : 'Your nick was registered. Please verify the nick by typing /verify (your password here)',
        unregistered : 'You have unregistered the nick',
        banlist : 'Globally banned: {0}',
        channel_banlist : 'Channel banned: {0}',
        access_granted : 'User {0} now has level {1}',
        whoami : 'You are {0} with role {1} with access_level {2} with ip {3}',
        whois : '{0} has role {1} with access_level {2} with ip {3} and is {4}',
        whoiss : '{0} has role {1} with access_level {2} with vHost {3} and is {4}',
        user_doesnt_exist : '{0} does not exist',
        find_ip : 'ip {0} uses: {1}',
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
        no_banned_global : 'There is nothing banned globally',
        reset_user : '{0} has been reset',
        change_password : 'You have changed your password',
        enterSamePassword : 'Please enter the same password that you did when you registered',
        oldPasswordWrong : 'Your old password is not correct',
        user_exist_not_registered : '{0} exists but is not registered',
        throttled : 'Either you are doing that too much, or the site is under too much load',
        temporary_ban : 'You are way too fast, you have been banned for a while, try again later',
        muted : 'You have been muted, please try again later.',
        registeredName : 'That nick is registered',
	vhosttaken : '{0} has already been taken as a vHost.',
    },

    names : [ "Aaron", "Abdul", "Abe", "Abel", "Abraham", "Abram", "Adalberto", "Adam", "Adan", "Adolfo", "Adolph", "Adrian", "Agustin", "Ahmad", "Ahmed", "Al", "Alan", "Albert", "Alberto", "Alden", "Aldo", "Alec", "Alejandro", "Alex", "Alexander", "Alexis", "Alfonso", "Alfonzo", "Alfred", "Alfredo", "Ali", "Allan", "Allen", "Alonso", "Alonzo", "Alphonse", "Alphonso", "Alton", "Alva", "Alvaro", "Alvin", "Amado", "Ambrose", "Amos", "Anderson", "Andre", "Andrea", "Andreas", "Andres", "Andrew", "Andy", "Angel", "Angelo", "Anibal", "Anthony", "Antione", "Antoine", "Anton", "Antone", "Antonia", "Antonio", "Antony", "Antwan", "Archie", "Arden", "Ariel", "Arlen", "Arlie", "Armand", "Armando", "Arnold", "Arnoldo", "Arnulfo", "Aron", "Arron", "Art", "Arthur", "Arturo", "Asa", "Ashley", "Aubrey", "August", "Augustine", "Augustus", "Aurelio", "Austin", "Avery", "Barney", "Barrett", "Barry", "Bart", "Barton", "Basil", "Beau", "Ben", "Benedict", "Benito", "Benjamin", "Bennett", "Bennie", "Benny", "Benton", "Bernard", "Bernardo", "Bernie", "Berry", "Bert", "Bertram", "Bill", "Billie", "Billy", "Blaine", "Blair", "Blake", "Bo", "Bob", "Bobbie", "Bobby", "Booker", "Boris", "Boyce", "Boyd", "Brad", "Bradford", "Bradley", "Bradly", "Brady", "Brain", "Branden", "Brandon", "Brant", "Brendan", "Brendon", "Brent", "Brenton", "Bret", "Brett", "Brian", "Brice", "Britt", "Brock", "Broderick", "Brooks", "Bruce", "Bruno", "Bryan", "Bryant", "Bryce", "Bryon", "Buck", "Bud", "Buddy", "Buford", "Burl", "Burt", "Burton", "Buster", "Byron", "Caleb", "Calvin", "Cameron", "Carey", "Carl", "Carlo", "Carlos", "Carlton", "Carmelo", "Carmen", "Carmine", "Carol", "Carrol", "Carroll", "Carson", "Carter", "Cary", "Casey", "Cecil", "Cedric", "Cedrick", "Cesar", "Chad", "Chadwick", "Chance", "Chang", "Charles", "Charley", "Charlie", "Chas", "Chase", "Chauncey", "Chester", "Chet", "Chi", "Chong", "Chris", "Christian", "Christoper", "Christopher", "Chuck", "Chung", "Clair", "Clarence", "Clark", "Claud", "Claude", "Claudio", "Clay", "Clayton", "Clement", "Clemente", "Cleo", "Cletus", "Cleveland", "Cliff", "Clifford", "Clifton", "Clint", "Clinton", "Clyde", "Cody", "Colby", "Cole", "Coleman", "Colin", "Collin", "Colton", "Columbus", "Connie", "Conrad", "Cordell", "Corey", "Cornelius", "Cornell", "Cortez", "Cory", "Courtney", "Coy", "Craig", "Cristobal", "Cristopher", "Cruz", "Curt", "Curtis", "Cyril", "Cyrus", "Dale", "Dallas", "Dalton", "Damian", "Damien", "Damion", "Damon", "Dan", "Dana", "Dane", "Danial", "Daniel", "Danilo", "Dannie", "Danny", "Dante", "Darell", "Daren", "Darin", "Dario", "Darius", "Darnell", "Daron", "Darrel", "Darrell", "Darren", "Darrick", "Darrin", "Darron", "Darryl", "Darwin", "Daryl", "Dave", "David", "Davis", "Dean", "Deandre", "Deangelo", "Dee", "Del", "Delbert", "Delmar", "Delmer", "Demarcus", "Demetrius", "Denis", "Dennis", "Denny", "Denver", "Deon", "Derek", "Derick", "Derrick", "Deshawn", "Desmond", "Devin", "Devon", "Dewayne", "Dewey", "Dewitt", "Dexter", "Dick", "Diego", "Dillon", "Dino", "Dion", "Dirk", "Domenic", "Domingo", "Dominic", "Dominick", "Dominique", "Don", "Donald", "Dong", "Donn", "Donnell", "Donnie", "Donny", "Donovan", "Donte", "Dorian", "Dorsey", "Doug", "Douglas", "Douglass", "Doyle", "Drew", "Duane", "Dudley", "Duncan", "Dustin", "Dusty", "Dwain", "Dwayne", "Dwight", "Dylan", "Earl", "Earle", "Earnest", "Ed", "Eddie", "Eddy", "Edgar", "Edgardo", "Edison", "Edmond", "Edmund", "Edmundo", "Eduardo", "Edward", "Edwardo", "Edwin", "Efrain", "Efren", "Elbert", "Elden", "Eldon", "Eldridge", "Eli", "Elias", "Elijah", "Eliseo", "Elisha", "Elliot", "Elliott", "Ellis", "Ellsworth", "Elmer", "Elmo", "Eloy", "Elroy", "Elton", "Elvin", "Elvis", "Elwood", "Emanuel", "Emerson", "Emery", "Emil", "Emile", "Emilio", "Emmanuel", "Emmett", "Emmitt", "Emory", "Enoch", "Enrique", "Erasmo", "Eric", "Erich", "Erick", "Erik", "Erin", "Ernest", "Ernesto", "Ernie", "Errol", "Ervin", "Erwin", "Esteban", "Ethan", "Eugene", "Eugenio", "Eusebio", "Evan", "Everett", "Everette", "Ezekiel", "Ezequiel", "Ezra", "Fabian", "Faustino", "Fausto", "Federico", "Felipe", "Felix", "Felton", "Ferdinand", "Fermin", "Fernando", "Fidel", "Filiberto", "Fletcher", "Florencio", "Florentino", "Floyd", "Forest", "Forrest", "Foster", "Frances", "Francesco", "Francis", "Francisco", "Frank", "Frankie", "Franklin", "Franklyn", "Fred", "Freddie", "Freddy", "Frederic", "Frederick", "Fredric", "Fredrick", "Freeman", "Fritz", "Gabriel", "Gail", "Gale", "Galen", "Garfield", "Garland", "Garret", "Garrett", "Garry", "Garth", "Gary", "Gaston", "Gavin", "Gayle", "Gaylord", "Genaro", "Gene", "Geoffrey", "George", "Gerald", "Geraldo", "Gerard", "Gerardo", "German", "Gerry", "Gil", "Gilbert", "Gilberto", "Gino", "Giovanni", "Giuseppe", "Glen", "Glenn", "Gonzalo", "Gordon", "Grady", "Graham", "Graig", "Grant", "Granville", "Greg", "Gregg", "Gregorio", "Gregory", "Grover", "Guadalupe", "Guillermo", "Gus", "Gustavo", "Guy", "Hai", "Hal", "Hank", "Hans", "Harlan", "Harland", "Harley", "Harold", "Harris", "Harrison", "Harry", "Harvey", "Hassan", "Hayden", "Haywood", "Heath", "Hector", "Henry", "Herb", "Herbert", "Heriberto", "Herman", "Herschel", "Hershel", "Hilario", "Hilton", "Hipolito", "Hiram", "Hobert", "Hollis", "Homer", "Hong", "Horace", "Horacio", "Hosea", "Houston", "Howard", "Hoyt", "Hubert", "Huey", "Hugh", "Hugo", "Humberto", "Hung", "Hunter", "Hyman", "Ian", "Ignacio", "Ike", "Ira", "Irvin", "Irving", "Irwin", "Isaac", "Isaiah", "Isaias", "Isiah", "Isidro", "Ismael", "Israel", "Isreal", "Issac", "Ivan", "Ivory", "Jacinto", "Jack", "Jackie", "Jackson", "Jacob", "Jacques", "Jae", "Jaime", "Jake", "Jamaal", "Jamal", "Jamar", "Jame", "Jamel", "James", "Jamey", "Jamie", "Jamison", "Jan", "Jared", "Jarod", "Jarred", "Jarrett", "Jarrod", "Jarvis", "Jason", "Jasper", "Javier", "Jay", "Jayson", "Jc", "Jean", "Jed", "Jeff", "Jefferey", "Jefferson", "Jeffery", "Jeffrey", "Jeffry", "Jerald", "Jeramy", "Jere", "Jeremiah", "Jeremy", "Jermaine", "Jerold", "Jerome", "Jeromy", "Jerrell", "Jerrod", "Jerrold", "Jerry", "Jess", "Jesse", "Jessie", "Jesus", "Jewel", "Jewell", "Jim", "Jimmie", "Jimmy", "Joan", "Joaquin", "Jody", "Joe", "Joel", "Joesph", "Joey", "John", "Johnathan", "Johnathon", "Johnie", "Johnnie", "Johnny", "Johnson", "Jon", "Jonah", "Jonas", "Jonathan", "Jonathon", "Jordan", "Jordon", "Jorge", "Jose", "Josef", "Joseph", "Josh", "Joshua", "Josiah", "Jospeh", "Josue", "Juan", "Jude", "Judson", "Jules", "Julian", "Julio", "Julius", "Junior", "Justin", "Kareem", "Karl", "Kasey", "Keenan", "Keith", "Kelley", "Kelly", "Kelvin", "Ken", "Kendall", "Kendrick", "Keneth", "Kenneth", "Kennith", "Kenny", "Kent", "Kenton", "Kermit", "Kerry", "Keven", "Kevin", "Kieth", "Kim", "King", "Kip", "Kirby", "Kirk", "Korey", "Kory", "Kraig", "Kris", "Kristofer", "Kristopher", "Kurt", "Kurtis", "Kyle", "Lacy", "Lamar", "Lamont", "Lance", "Landon", "Lane", "Lanny", "Larry", "Lauren", "Laurence", "Lavern", "Laverne", "Lawerence", "Lawrence", "Lazaro", "Leandro", "Lee", "Leif", "Leigh", "Leland", "Lemuel", "Len", "Lenard", "Lenny", "Leo", "Leon", "Leonard", "Leonardo", "Leonel", "Leopoldo", "Leroy", "Les", "Lesley", "Leslie", "Lester", "Levi", "Lewis", "Lincoln", "Lindsay", "Lindsey", "Lino", "Linwood", "Lionel", "Lloyd", "Logan", "Lon", "Long", "Lonnie", "Lonny", "Loren", "Lorenzo", "Lou", "Louie", "Louis", "Lowell", "Loyd", "Lucas", "Luciano", "Lucien", "Lucio", "Lucius", "Luigi", "Luis", "Luke", "Lupe", "Luther", "Lyle", "Lyman", "Lyndon", "Lynn", "Lynwood", "Mac", "Mack", "Major", "Malcolm", "Malcom", "Malik", "Man", "Manual", "Manuel", "Marc", "Marcel", "Marcelino", "Marcellus", "Marcelo", "Marco", "Marcos", "Marcus", "Margarito", "Maria", "Mariano", "Mario", "Marion", "Mark", "Markus", "Marlin", "Marlon", "Marquis", "Marshall", "Martin", "Marty", "Marvin", "Mary", "Mason", "Mathew", "Matt", "Matthew", "Maurice", "Mauricio", "Mauro", "Max", "Maximo", "Maxwell", "Maynard", "Mckinley", "Mel", "Melvin", "Merle", "Merlin", "Merrill", "Mervin", "Micah", "Michael", "Michal", "Michale", "Micheal", "Michel", "Mickey", "Miguel", "Mike", "Mikel", "Milan", "Miles", "Milford", "Millard", "Milo", "Milton", "Minh", "Miquel", "Mitch", "Mitchel", "Mitchell", "Modesto", "Mohamed", "Mohammad", "Mohammed", "Moises", "Monroe", "Monte", "Monty", "Morgan", "Morris", "Morton", "Mose", "Moses", "Moshe", "Murray", "Myles", "Myron", "Napoleon", "Nathan", "Nathanael", "Nathanial", "Nathaniel", "Neal", "Ned", "Neil", "Nelson", "Nestor", "Neville", "Newton", "Nicholas", "Nick", "Nickolas", "Nicky", "Nicolas", "Nigel", "Noah", "Noble", "Noe", "Noel", "Nolan", "Norbert", "Norberto", "Norman", "Normand", "Norris", "Numbers", "Octavio", "Odell", "Odis", "Olen", "Olin", "Oliver", "Ollie", "Omar", "Omer", "Oren", "Orlando", "Orval", "Orville", "Oscar", "Osvaldo", "Oswaldo", "Otha", "Otis", "Otto", "Owen", "Pablo", "Palmer", "Paris", "Parker", "Pasquale", "Pat", "Patricia", "Patrick", "Paul", "Pedro", "Percy", "Perry", "Pete", "Peter", "Phil", "Philip", "Phillip", "Pierre", "Porfirio", "Porter", "Preston", "Prince", "Quentin", "Quincy", "Quinn", "Quintin", "Quinton", "Rafael", "Raleigh", "Ralph", "Ramiro", "Ramon", "Randal", "Randall", "Randell", "Randolph", "Randy", "Raphael", "Rashad", "Raul", "Ray", "Rayford", "Raymon", "Raymond", "Raymundo", "Reed", "Refugio", "Reggie", "Reginald", "Reid", "Reinaldo", "Renaldo", "Renato", "Rene", "Reuben", "Rex", "Rey", "Reyes", "Reynaldo", "Rhett", "Ricardo", "Rich", "Richard", "Richie", "Rick", "Rickey", "Rickie", "Ricky", "Rico", "Rigoberto", "Riley", "Rob", "Robbie", "Robby", "Robert", "Roberto", "Robin", "Robt", "Rocco", "Rocky", "Rod", "Roderick", "Rodger", "Rodney", "Rodolfo", "Rodrick", "Rodrigo", "Rogelio", "Roger", "Roland", "Rolando", "Rolf", "Rolland", "Roman", "Romeo", "Ron", "Ronald", "Ronnie", "Ronny", "Roosevelt", "Rory", "Rosario", "Roscoe", "Rosendo", "Ross", "Roy", "Royal", "Royce", "Ruben", "Rubin", "Rudolf", "Rudolph", "Rudy", "Rueben", "Rufus", "Rupert", "Russ", "Russel", "Russell", "Rusty", "Ryan", "Sal", "Salvador", "Salvatore", "Sam", "Sammie", "Sammy", "Samual", "Samuel", "Sandy", "Sanford", "Sang", "Santiago", "Santo", "Santos", "Saul", "Scot", "Scott", "Scottie", "Scotty", "Sean", "Sebastian", "Sergio", "Seth", "Seymour", "Shad", "Shane", "Shannon", "Shaun", "Shawn", "Shayne", "Shelby", "Sheldon", "Shelton", "Sherman", "Sherwood", "Shirley", "Shon", "Sid", "Sidney", "Silas", "Simon", "Sol", "Solomon", "Son", "Sonny", "Spencer", "Stacey", "Stacy", "Stan", "Stanford", "Stanley", "Stanton", "Stefan", "Stephan", "Stephen", "Sterling", "Steve", "Steven", "Stevie", "Stewart", "Stuart", "Sung", "Sydney", "Sylvester", "Tad", "Tanner", "Taylor", "Ted", "Teddy", "Teodoro", "Terence", "Terrance", "Terrell", "Terrence", "Terry", "Thad", "Thaddeus", "Thanh", "Theo", "Theodore", "Theron", "Thomas", "Thurman", "Tim", "Timmy", "Timothy", "Titus", "Tobias", "Toby", "Tod", "Todd", "Tom", "Tomas", "Tommie", "Tommy", "Toney", "Tony", "Tory", "Tracey", "Tracy", "Travis", "Trent", "Trenton", "Trevor", "Trey", "Trinidad", "Tristan", "Troy", "Truman", "Tuan", "Ty", "Tyler", "Tyree", "Tyrell", "Tyron", "Tyrone", "Tyson", "Ulysses", "Val", "Valentin", "Valentine", "Van", "Vance", "Vaughn", "Vern", "Vernon", "Vicente", "Victor", "Vince", "Vincent", "Vincenzo", "Virgil", "Virgilio", "Vito", "Von", "Wade", "Waldo", "Walker", "Wallace", "Wally", "Walter", "Walton", "Ward", "Warner", "Warren", "Waylon", "Wayne", "Weldon", "Wendell", "Werner", "Wes", "Wesley", "Weston", "Whitney", "Wilber", "Wilbert", "Wilbur", "Wilburn", "Wiley", "Wilford", "Wilfred", "Wilfredo", "Will", "Willard", "William", "Williams", "Willian", "Willie", "Willis", "Willy", "Wilmer", "Wilson", "Wilton", "Winford", "Winfred", "Winston", "Wm", "Woodrow", "Wyatt", "Xavier", "Yong", "Young", "Zachariah", "Zachary", "Zachery", "Zack", "Zackary", "Zane" ]
};

_.each(settings, function(setting, key) {
    var override = module.exports[key];
    if (override) {
        if (setting) {
            _.extend(override, setting);
        } else {
            module.exports[key] = null;
        }
    } else {
        module.exports[key] = setting;
    }
});
