/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `chat_banned`
--

DROP TABLE IF EXISTS `chat_banned`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `chat_banned` (
  `banned` varchar(200) NOT NULL,
  `channel` varchar(100) DEFAULT NULL,
  UNIQUE KEY `banned_UNIQUE` (`banned`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chat_banned`
--

LOCK TABLES `chat_banned` WRITE;
/*!40000 ALTER TABLE `chat_banned` DISABLE KEYS */;
/*!40000 ALTER TABLE `chat_banned` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `chat_channel_info`
--

DROP TABLE IF EXISTS `chat_channel_info`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `chat_channel_info` (
  `channel` varchar(200) NOT NULL,
  `info_key` varchar(100) NOT NULL,
  `value` varchar(2000) DEFAULT NULL,
  PRIMARY KEY (`channel`,`info_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chat_channel_info`
--

LOCK TABLES `chat_channel_info` WRITE;
/*!40000 ALTER TABLE `chat_channel_info` DISABLE KEYS */;
/*!40000 ALTER TABLE `chat_channel_info` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `chat_users`
--

DROP TABLE IF EXISTS `chat_users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `chat_users` (
  `nick` varchar(100) NOT NULL,
  `vHost` varchar(100) DEFAULT NULL,
  `flair` varchar(255) DEFAULT NULL,
  `remote_addr` varchar(100) NOT NULL,
  `pw_hash` varchar(256) DEFAULT NULL,
  `access_level` int(11) DEFAULT NULL,
  `email_address` varchar(1000) DEFAULT NULL,
  `verification_code` varchar(64) DEFAULT NULL,
  `verified` tinyint(4) NOT NULL DEFAULT '0',
  `registered` tinyint(4) NOT NULL DEFAULT '0',
  PRIMARY KEY (`nick`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chat_users`
--

LOCK TABLES `chat_users` WRITE;
/*!40000 ALTER TABLE `chat_users` DISABLE KEYS */;
/*!40000 ALTER TABLE `chat_users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

