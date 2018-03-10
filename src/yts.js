/*ytstream.js
Version 0.1
Last update:10/03/2018
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
  $.each(q, function(i, arr) {
    arr = arr.split('=');
    j[arr[0]] = decodeURIComponent(arr[1]);
  });
  return j;
}

function getStreams(videoID,callback){
	$.ajax({
		url: 'https://www.youtube.com/get_video_info?video_id={0}&asv=3&el=detailpage&hl=en_US'.format(videoID),
		type: "GET",
		crossDomain: true
	}).done(function(data){
		info=qsToJson(data);
		stream_map=info.adaptive_fmts.concat(info.url_encoded_fmt_stream_map);
		streams={};
		lis=stream_map.split(",");
		$.each(lis,function(k1,v1){
			curritem={};
			infos=v1.split("&");
			$.each(infos,function(k2,v2){
				par=v2.split("=");
				curritem[par[0]]=decodeURIComponent(par[1]);
			});
			streams[curritem['itag']]=curritem;
		});
		callback(streams);
	});
}
function getDecipherFunction(videoID,callbackF){
    return $.ajax({
		url: 'https://www.youtube.com/watch?v={0}'.format(videoID),
		type: "GET",
		crossDomain: true
    }).done(function(pageInfo){
		playerid = pageInfo.split('/yts/jsbin/player-');
		durl=playerid[1].split('"')[0];
		dechipherEnd=$.ajax({
			url: 'https://youtube.com/yts/jsbin/player-{0}'.format(durl),
            type: "GET",
            crossDomain: true
        }).done(function(decipherScript){
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
			decipher = decipherScript.split(deciphers+'={')[1];
			decipher = decipher.split('}}')[0];
			sFunc = 'var ' + deciphers + '={' + decipher + ';}}; ';
			mFunc = 'decipherSignature=function(a){' + decipherPatterns + ';}; ';
			eval(sFunc+mFunc);
			callbackF(decipherSignature);
        });
    });
}
function getDownloadURLByStream(target,callback){
	if (typeof target === 'undefined'){
		throw "Stream doesn't exist";
	}
	if (!(typeof target["s"] === 'undefined')){
		getDecipherFunction(videoID,function(df){
			callback(target['url']+'&ratebypass=yes&signature='+df(target['s']));
		});
	}else{
		callback(target['url']+'&ratebypass=yes');
	}
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
