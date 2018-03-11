/*ytstream.js
Version 0.2
Last update:11/03/2018
Author: danielchc
*/

if (!String.prototype.format) {
  String.prototype.format = function() {
    var args = arguments;
    return this.replace(/{(\d+)}/g, function(match, number) {
      return typeof args[number] != 'undefined'
        ? args[number]
        : match
      ;
    });
  };
}

function qsToJson(qs){
  var j;
  q=qs.split("&");
  j = {};
  for (i=0;i<q.length;i++){
  	arr=q[i];
  	arr = arr.split('=');
    j[arr[0]] = decodeURIComponent(arr[1]);
  }
  return j;
}

function getStreams(videoID,callback){
  	var xhttp = new XMLHttpRequest();
  	xhttp.onreadystatechange = function() {
    	if (this.readyState == 4 && this.status == 200) {
    		info=qsToJson(xhttp.responseText);
			stream_map=info.adaptive_fmts;
			streams={};
			lis=stream_map.split(",");
			for(i=0;i<lis.length;i++){
				v1=lis[i];
				curritem={}
				infos=v1.split("&");
				for(j=0;j<infos.length;j++){
					v2=infos[j];
					par=v2.split("=")
					curritem[par[0]]=decodeURIComponent(par[1]);
				};
				streams[curritem['itag']]=curritem;
			};
			callback(streams);
    	}
    }
    xhttp.open("GET", 'https://www.youtube.com/get_video_info?video_id={0}&asv=3&el=detailpage&hl=en_US'.format(videoID), true);
  	xhttp.send();

}
function getDecipherFunction(videoID,callbackF){
	var pageInfo = new XMLHttpRequest();
  	pageInfo.onreadystatechange = function() {
    	if (this.readyState == 4 && this.status == 200) {
    		playerid = pageInfo.responseText.split('/yts/jsbin/player-');
			durl=playerid[1].split('"')[0];
			var decipherScriptR = new XMLHttpRequest();
  			decipherScriptR.onreadystatechange = function() {
	    		if (this.readyState == 4 && this.status == 200) {
	    			decipherScript=decipherScriptR.responseText
	    			signatureCall = decipherScript.split('||"signature",');
					signatureLen = Object.keys(signatureCall).length;
					signatureFunction='';
					for (i=signatureLen-1;i>0;i--){
						signatureCall[i]=signatureCall[i].split(');')[0];
						if (signatureCall[i].indexOf('(')){
							signatureFunction=signatureCall[i].split('()')[0];
						}else{
							throw "Error descrypting signature";
							break;
						}
					}
					decipherPatterns = decipherScript.split(signatureFunction.split("(")[0]+'=function(')[1].split("};")[0].split("{")[1];
					deciphers=decipherPatterns.split("(a");
					for (i=0;i<Object.keys(deciphers).length;i++){
						deciphers[i]=deciphers[i].split(';')[1].split('.')[0];
						if(decipherPatterns.split(deciphers[i]).length>=2){
							deciphers=deciphers[i];
							break;
						}else{
							throw "Error getting decrypt patterns";
							break;
						}
					}
					decipher = decipherScript.split(deciphers+'={')[1]
					decipher = decipher.split('}}')[0];
					sFunc = 'var ' + deciphers + '={' + decipher + ';}}; ';
					mFunc = 'decipherSignature=function(a){' + decipherPatterns + ';}; ';
					eval(sFunc+mFunc);
					callbackF(decipherSignature);
	    		}
	    	}
	    	decipherScriptR.open("GET", 'https://youtube.com/yts/jsbin/player-{0}'.format(durl), true);
  			decipherScriptR.send();
    	}
    };
    pageInfo.open("GET", 'https://www.youtube.com/watch?v={0}'.format(videoID), true);
	pageInfo.send();
}

function getDownloadURL(videoID,stream,callback){
	getStreams(videoID,function(streams){
		target=streams[stream];
		if (typeof target === 'undefined'){
			throw "Stream doesn`t exist";
		}
		if (!(typeof target["s"] === 'undefined')){
			getDecipherFunction(videoID,function(df){
				callback(target['url']+'&ratebypass=yes&signature='+df(target['s']));
			});
		}else{
			callback(target['url']+'&ratebypass=yes');
		}
	});
}
