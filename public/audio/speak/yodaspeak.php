<?php
echo 'error';
$url = "http://www.yodaspeak.co.uk/index.php";

$curse = str_replace(
    array('fuck','faggot','nigger','cunt','bitch','ass ','cock','dick','shit','pussy','twat', 'tit', 'boob', 'penis', 'sex', 'wank'),
    array('fuhk','fagot','niggur','cuhnt','bittch','azs ','cawk','dik','shidt','pussee','twaht','tidt', 'bhoob', 'peenis', 'seks', 'whank'),
    $_GET['text']);


$headers = array(
            "Host: yodaspeak.co.uk",
            "Accept: application/xml, text/xml, */*; q=0.01",
            "Accept-Encoding: gzip, deflate",
            "User-Agent: Mozilla/5.0 (Windows NT 6.3; WOW64; rv:34.0) Gecko/20100101 Firefox/34.0",
            "Referer: http://www.yodaspeak.co.uk/index.php"
); 

$data = array(
	'YodaMe'=>$curse,
    'go'=>'Convert+to+Yoda-Speak%21',
   
);



$fields_string = http_build_query($data);


$ch = curl_init();

curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt( $ch, CURLOPT_COOKIEJAR,  "cookies.txt" );
curl_setopt( $ch, CURLOPT_COOKIEFILE, "cookies.txt" );
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers); 
curl_setopt($ch, CURLOPT_POST, count($data));
curl_setopt($ch, CURLOPT_POSTFIELDS, $fields_string);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$output = curl_exec($ch);

curl_close($ch);

$yodafy = explode("name='YodaSpeak' rows='15' cols='30' readonly>", $output);
$yodafy = explode('</textarea>', $yodafy[1]);
$yodafy = $yodafy[0];

$yodafy = str_replace(
	 array('fuhk','fagot','niggur','cuhnt','bittch','azs ','cawk','dik','shidt','pussee','twaht','tidt', 'bhoob', 'peenis', 'seks', 'whank'),
    array('fuck','faggot','nigger','cunt','bitch','ass ','cock','dick','shit','pussy','twat', 'tit', 'boob', 'penis', 'sex', 'wank'),
    $yodafy);
  

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, stripcslashes($mp3));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HEADER, 0);
curl_setopt( $ch, CURLOPT_USERAGENT, "Mozilla/5.0 (Windows NT 6.1; WOW64; rv:10.0.2) Gecko/20100101 Firefox/10.0.2" );
$size = curl_getinfo($ch, CURLINFO_CONTENT_LENGTH_DOWNLOAD);
$mime = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$output = curl_exec($ch);

curl_close($ch);



$url = "https://acapela-box.com/AcaBox/dovaas.php";

$headers = array(
            "Host: acapela-box.com",
            "Accept: application/xml, text/xml, */*; q=0.01",
            "Accept-Encoding: gzip, deflate",
            "User-Agent: Mozilla/5.0 (Windows NT 6.3; WOW64; rv:34.0) Gecko/20100101 Firefox/34.0",
            "Referer: https://acapela-box.com/AcaBox/index.php"
); 

$data = array(
	'text'=>$yodafy,
    'voice'=>'willlittlecreature22k',
    'listen'=>'1',
    'format'=>'MP3',
    'codecMP3'=>'1',
    'spd'=>'175',
    'vct'=>'103'
);



$fields_string = http_build_query($data);


$ch = curl_init();

curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt( $ch, CURLOPT_COOKIEJAR,  "cookies.txt" );
curl_setopt( $ch, CURLOPT_COOKIEFILE, "cookies.txt" );
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers); 
curl_setopt($ch, CURLOPT_POST, count($data));
curl_setopt($ch, CURLOPT_POSTFIELDS, $fields_string);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$output = curl_exec($ch);

curl_close($ch);

$mp3 = explode('"snd_url":"', $output);
$mp3 = explode('","', $mp3[1]);
$mp3 = $mp3[0];

echo stripcslashes($mp3);

?>
