App = {
  provider: null,
  cancelScrypt: false,
  activeWallet: null,
  contract: null,

  setupWallet: function (wallet) {
    showWallet();

    App.provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545");
    App.activeWallet = wallet.connect(App.provider);

    var inputWalletAddress = $('#wallet-address');
    inputWalletAddress.val(wallet.address);

    $('#save-keystore').click(App.exportKeystore);

    App.setupSendEther();
    App.refreshUI();

    App.initToken();
    App.setupSendToken();
  },

  init: function() {
    App.initLoadJson();
    App.initLoadKey();
    App.initMnemonic();
  },

  updateLoading: function(progress) {
      console.log(progress);
      $("#loading-status").val( parseInt(progress * 100) + '%');
      return App.cancelScrypt;
  },

  initLoadJson: function() {
    setupDropFile(function(json, password) {
        if (ethers.utils.getJsonWalletAddress(json)) {
            showLoading('解密账号...');
            App.cancelScrypt = false;

            ethers.Wallet.fromEncryptedJson(json, password, App.updateLoading).then(function(wallet) {
                App.setupWallet(wallet);
            }, function(error) {
                if (error.message === 'invalid password') {
                    alert('Wrong Password');
                } else {
                  alert('解密账号发生错误...');
                  console.log(error);
                }
                showAccout();
            });
        } else {
            alert('Unknown JSON wallet format');
        }
    });
  },

  initLoadKey: function() {
    var inputPrivatekey = $('#select-privatekey');
    var submit = $('#select-submit-privatekey');

    // 生成一个默认的私钥
    let randomNumber = ethers.utils.bigNumberify(ethers.utils.randomBytes(32));
    inputPrivatekey.val(randomNumber._hex);

    submit.click(function() {
        if (submit.hasClass('disable')) { return; }
        var privateKey = inputPrivatekey.val();
        if (privateKey.substring(0, 2) !== '0x') { privateKey = '0x' + privateKey; }
        // 创建对应的钱包

        App.setupWallet(new ethers.Wallet(privateKey));

    });

    inputPrivatekey.on("input", function() {
        if (inputPrivatekey.val().match(/^(0x)?[0-9A-fa-f]{64}$/)) {
            submit.removeClass('disable');
        } else {
            submit.addClass('disable');
        }
    });

  },


  exportKeystore: function() {
    var pwd = $('#save-keystore-file-pwd');

    showLoading('导出私钥...');
    App.cancelScrypt = false;

    App.activeWallet.encrypt(pwd.val(), App.updateLoading).then(function(json) {
      showWallet();
      var blob = new Blob([json], {type: "text/plain;charset=utf-8"});
      saveAs(blob, "keystore.json");

    });
  },

  initMnemonic: function() {
    var inputPhrase = $('#select-mnemonic-phrase');
    var inputPath = $('#select-mnemonic-path');
    var submit = $('#select-submit-mnemonic');

// 生成助记词
    var mnemonic = ethers.utils.HDNode.entropyToMnemonic(ethers.utils.randomBytes(16));
    inputPhrase.val(mnemonic);

    function check() {
        if (ethers.utils.HDNode.isValidMnemonic(inputPhrase.val())) {
            submit.removeClass('disable');
        } else {
            submit.addClass('disable');
        }
    }
    inputPhrase.on("input", check);
    inputPath.on("input", check);

    submit.click(function() {
        if (submit.hasClass('disable')) { return; }
        App.setupWallet(ethers.Wallet.fromMnemonic(inputPhrase.val(), inputPath.val()));
    });

  },

  refreshUI: function() {
    var inputBalance = $('#wallet-balance');
    var inputTransactionCount = $('#wallet-transaction-count');

    $("#wallet-submit-refresh").click(function() {
      App.addActivity('> Refreshing details...');
      App.activeWallet.getBalance('pending').then(function(balance) {
          App.addActivity('< Balance: ' + balance.toString(10));
          inputBalance.val(ethers.utils.formatEther(balance, { commify: true }));
      }, function(error) {
          showError(error);
      });

      App.activeWallet.getTransactionCount('pending').then(function(transactionCount) {
          App.addActivity('< TransactionCount: ' + transactionCount);
          inputTransactionCount.val(transactionCount);
      }, function(error) {
          showError(error);
      });
    });

    $("#wallet-submit-refresh").click();

  },

  initToken: function() {

    $.getJSON('TutorialToken.json', function(data) {
      // 智能合约地址
      const address = data.networks["1337"].address;
      console.log(address);

      // 创建智能合约
      App.contract = new ethers.Contract(address, data.abi, App.provider);

      // const contract = web3.eth.contract(data.abi).at(address);
      // contract.transfer.estimateGas("0x627306090abaB3A6e1400e9345bC60c78a8BEf57", 1, {from: App.activeWallet.address}, function (gas) {
      //   console.log("gas:" + gas);
      // });

      console.log("contract:" + App.contract);

      App.refreshToken();
    });
  },

  refreshToken: function() {
    var tokenBalance = $('#wallet-token-balance');
    App.contract.balanceOf(App.activeWallet.address).then(function(balance){
        tokenBalance.val(balance);
    });
  },

  addActivity: function(message) {
    var activity = $('#wallet-activity');
    activity.append("</br>" + message);
  },

  setupSendEther: function() {
    var inputTargetAddress = $('#wallet-send-target-address');
    var inputAmount = $('#wallet-send-amount');
    var submit = $('#wallet-submit-send');

    // Validate the address and value (to enable the send button)
    function check() {
        try {
            ethers.utils.getAddress(inputTargetAddress.val());
            ethers.utils.parseEther(inputAmount.val());
        } catch (error) {
            submit.addClass('disable');
            return;
        }
        submit.removeClass('disable');
    }
    inputTargetAddress.on("input", check);
    inputAmount.on("input", check);

    // Send ether
    submit.click(function() {

        // Matt (from Etherscan) is working on a gasPrice API call, which
        // should be done within a week or so.
        // @TODO
        //var gasPrice = (activeWallet.provider.testnet ? 0x4a817c800: 0xba43b7400);
        //console.log('GasPrice: ' + gasPrice);

        var targetAddress = ethers.utils.getAddress(inputTargetAddress.val());
        var amountWei = ethers.utils.parseEther(inputAmount.val());

        App.activeWallet.sendTransaction({
            to: targetAddress,
            value: amountWei,
            //gasPrice: activeWallet.provider.getGasPrice(),
            //gasLimit: 21000,
        }).then(function(tx) {
            console.log(tx);

            App.addActivity('< Transaction sent: ' + tx.hash.substring(0, 20) + '...');
            alert('Success!');

            inputTargetAddress.val('');
            inputAmount.val('');
            submit.addClass('disable');

            App.refreshUI();
        }, function(error) {
            console.log(error);
            showError(error);
        });
    })
  },

  // estimateGas: function() {
  //
  //   // Set recipient address and transfer value first.
  //   let to_address = App.activeWallet.address;
  //
  //   let transfer_val = sender_val;
  //
  //   // function signature is the first 4 bytes of the sha3 hash
  //   let function_signature = web3.sha3('transfer(address,uint256)').substring(0,10)
  //
  //   // we have to make the address field 32 bytes
  //   let address_param = '0'.repeat(24)+to_address.substring(2)
  //
  //   // likewise, we have to make the transfer value 32 bytes
  //   let transfer_value_param = web3.toHex(web3.toBigNumber(transfer_val*Math.pow(10, 18)).toNumber())
  //   let transfer_value_prefix = '0'.repeat((66 - transfer_value_param.length))
  //
  //   // combining the function sig and all the arguments
  //   let transfer_data = function_signature + address_param + transfer_value_prefix + transfer_value_param.substring(2)
  //
  //   // We are ready to estimateGas with all the data ready.
  //   var result = web3.eth.estimateGas({
  //     from: from_address,
  //     // token contract address
  //     to: contract_address,
  //     data: transfer_data,
  //   });
  //
  //   console.log(result)
  //
  // }

  setupSendToken: function() {
    var inputTargetAddress = $('#wallet-token-send-target-address');
    var inputAmount = $('#wallet-token-send-amount');
    var submit = $('#wallet-token-submit-send');

    // Validate the address and value (to enable the send button)
    function check() {
        try {
            ethers.utils.getAddress(inputTargetAddress.val());
        } catch (error) {
            submit.addClass('disable');
            return;
        }
        submit.removeClass('disable');
    }

    inputTargetAddress.on("input", check);
    inputAmount.on("input",check);


    // Send token
    submit.click(function() {
        var targetAddress = ethers.utils.getAddress(inputTargetAddress.val());
        var amount = inputAmount.val();

        App.contract.estimate.transfer(targetAddress, amount)
          .then(function(gas) {
              console.log("gas:" +  gas);
          });

        // https://ethgasstation.info/json/ethgasAPI.json
        // https://ethgasstation.info/gasrecs.php
        App.provider.getGasPrice().then((gasPrice) => {
            // gasPrice is a BigNumber; convert it to a decimal string
            gasPriceString = gasPrice.toString();

            console.log("Current gas price: " + gasPriceString);
          });


        let contractWithSigner = App.contract.connect(App.activeWallet);



        contractWithSigner.transfer(targetAddress, amount, {
          gasLimit: 500000,
          gasPrice: ethers.utils.parseUnits("2", "gwei"),
        }).then(function(tx) {
            console.log(tx);

            App.addActivity('< Token sent: ' + tx.hash.substring(0, 20) + '...');
            alert('Success!');

            inputTargetAddress.val('');
            inputAmount.val('') ;
            submit.addClass('disable');

            App.refreshToken();
        }, function(error) {
            console.log(error);
            App.showError(error);
        });
    });
  }
}


App.init();

// 0x627306090abaB3A6e1400e9345bC60c78a8BEf57
// var privateKey = 'c87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3';
// App.setupWallet(new ethers.Wallet(privateKey));
