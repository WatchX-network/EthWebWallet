


function setEnter(source, target) {
    source.onkeyup = function(e) {
        if (e.which === 13) { target.click(); }
    }
}

var cancelScrypt = false;
document.getElementById('loading-cancel').onclick = function() {
    cancelScrypt = true;
};

var updateLoading = (function() {
    var loadingStatus = document.getElementById('loading-status');
    return (function(progress) {
        loadingStatus.value = (parseInt(progress * 100)) + '%';
        return cancelScrypt;
    });
})();

// JSON Wallet
(function() {
    var inputFile = document.getElementById('select-wallet-file');
    var targetDrop = document.getElementById('select-wallet-drop');
    var inputPassword = document.getElementById('select-wallet-password');
    var submit = document.getElementById('select-submit-wallet');

    function check() {
        if (inputFile.files && inputFile.files.length === 1) {
            submit.classList.remove('disable');
            targetDrop.textContent = inputFile.files[0].name;
        } else {
            submit.classList.add('disable');
        }
    }
    inputFile.onchange = check;
    inputPassword.oninput = check;

    setEnter(inputPassword, submit);

    inputFile.addEventListener('dragover', function(event) {
        event.preventDefault();
        event.stopPropagation();
        targetDrop.classList.add('highlight');
    }, true);

    inputFile.addEventListener('drop', function(event) {
        targetDrop.classList.remove('highlight');
    }, true);

    submit.onclick = function() {
        if (submit.classList.contains('disable')) { return; }

        var fileReader = new FileReader();
        fileReader.onload = function(e) {
            var json = e.target.result;

            if (ethers.utils.getJsonWalletAddress(json)) {
                showLoading('Decrypting Wallet...');

                cancelScrypt = false;

                ethers.Wallet.fromEncryptedJson(json, inputPassword.value, updateLoading).then(function(wallet) {
                    showWallet(wallet);

                }, function(error) {
                    if (error.message === 'invalid password') {
                        alert('Wrong Password');
                    } else {
                        console.log(error);
                        alert('Error Decrypting Wallet');
                    }
                    showSelect();
                });
            } else {
                alert('Unknown JSON wallet format');
            }
        };
        fileReader.readAsText(inputFile.files[0]);
    };

})();

// Raw Private Key
(function() {
    var inputPrivatekey = document.getElementById('select-privatekey');
    var submit = document.getElementById('select-submit-privatekey');

    function check() {
        if (inputPrivatekey.value.match(/^(0x)?[0-9A-fa-f]{64}$/)) {
            submit.classList.remove('disable');
        } else {
            submit.classList.add('disable');
        }
    }
    inputPrivatekey.oninput = check;

    setEnter(inputPrivatekey, submit);

    submit.onclick = function() {
        if (submit.classList.contains('disable')) { return; }
        var privateKey = inputPrivatekey.value;
        if (privateKey.substring(0, 2) !== '0x') { privateKey = '0x' + privateKey; }
        showWallet(new ethers.Wallet(privateKey));
    }
})();

// Mnemonic Phrase
(function() {
    var inputPhrase = document.getElementById('select-mnemonic-phrase');
    var inputPath = document.getElementById('select-mnemonic-path');
    var submit = document.getElementById('select-submit-mnemonic');

    function check() {
        if (ethers.utils.HDNode.isValidMnemonic(inputPhrase.value)) {
            submit.classList.remove('disable');
        } else {
            submit.classList.add('disable');
        }
    }
    inputPhrase.oninput = check;
    inputPath.oninput = check;

    setEnter(inputPhrase, submit);
    setEnter(inputPath, submit);

    submit.onclick = function() {
        if (submit.classList.contains('disable')) { return; }
        showWallet(ethers.Wallet.fromMnemonic(inputPhrase.value, inputPath.value));
    }
})();


var activeWallet = null;
var contract = null;

function showError(error) {
    alert('Error \u2014 ' + error.message);
}

// Refresh balance and transaction count in the UI
var refreshUI = (function() {
    var inputBalance = document.getElementById('wallet-balance');
    var inputTransactionCount = document.getElementById('wallet-transaction-count');
    var submit = document.getElementById('wallet-submit-refresh');

    function refresh() {
        addActivity('> Refreshing details...');
        activeWallet.getBalance('pending').then(function(balance) {
            addActivity('< Balance: ' + balance.toString(10));
            inputBalance.value = ethers.utils.formatEther(balance, { commify: true });
        }, function(error) {
            showError(error);
        });
        activeWallet.getTransactionCount('pending').then(function(transactionCount) {
            addActivity('< TransactionCount: ' + transactionCount);
            inputTransactionCount.value = transactionCount;
        }, function(error) {
            showError(error);
        });
    }
    submit.onclick = refresh;

    return refresh;
})();


var refreshToken = (function() {

  const abi = [
    {
      "constant": true,
      "inputs": [],
      "name": "name",
      "outputs": [
        {
          "name": "",
          "type": "string"
        }
      ],
      "payable": false,
      "stateMutability": "view",
      "type": "function"
    },
    {
      "constant": false,
      "inputs": [
        {
          "name": "_spender",
          "type": "address"
        },
        {
          "name": "_value",
          "type": "uint256"
        }
      ],
      "name": "approve",
      "outputs": [
        {
          "name": "",
          "type": "bool"
        }
      ],
      "payable": false,
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "constant": true,
      "inputs": [],
      "name": "totalSupply",
      "outputs": [
        {
          "name": "",
          "type": "uint256"
        }
      ],
      "payable": false,
      "stateMutability": "view",
      "type": "function"
    },
    {
      "constant": false,
      "inputs": [
        {
          "name": "_from",
          "type": "address"
        },
        {
          "name": "_to",
          "type": "address"
        },
        {
          "name": "_value",
          "type": "uint256"
        }
      ],
      "name": "transferFrom",
      "outputs": [
        {
          "name": "",
          "type": "bool"
        }
      ],
      "payable": false,
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "constant": true,
      "inputs": [],
      "name": "INITIAL_SUPPLY",
      "outputs": [
        {
          "name": "",
          "type": "uint256"
        }
      ],
      "payable": false,
      "stateMutability": "view",
      "type": "function"
    },
    {
      "constant": true,
      "inputs": [],
      "name": "decimals",
      "outputs": [
        {
          "name": "",
          "type": "uint8"
        }
      ],
      "payable": false,
      "stateMutability": "view",
      "type": "function"
    },
    {
      "constant": false,
      "inputs": [
        {
          "name": "_spender",
          "type": "address"
        },
        {
          "name": "_subtractedValue",
          "type": "uint256"
        }
      ],
      "name": "decreaseApproval",
      "outputs": [
        {
          "name": "",
          "type": "bool"
        }
      ],
      "payable": false,
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "constant": true,
      "inputs": [
        {
          "name": "_owner",
          "type": "address"
        }
      ],
      "name": "balanceOf",
      "outputs": [
        {
          "name": "",
          "type": "uint256"
        }
      ],
      "payable": false,
      "stateMutability": "view",
      "type": "function"
    },
    {
      "constant": true,
      "inputs": [],
      "name": "symbol",
      "outputs": [
        {
          "name": "",
          "type": "string"
        }
      ],
      "payable": false,
      "stateMutability": "view",
      "type": "function"
    },
    {
      "constant": false,
      "inputs": [
        {
          "name": "_to",
          "type": "address"
        },
        {
          "name": "_value",
          "type": "uint256"
        }
      ],
      "name": "transfer",
      "outputs": [
        {
          "name": "",
          "type": "bool"
        }
      ],
      "payable": false,
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "constant": false,
      "inputs": [
        {
          "name": "_spender",
          "type": "address"
        },
        {
          "name": "_addedValue",
          "type": "uint256"
        }
      ],
      "name": "increaseApproval",
      "outputs": [
        {
          "name": "",
          "type": "bool"
        }
      ],
      "payable": false,
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "constant": true,
      "inputs": [
        {
          "name": "_owner",
          "type": "address"
        },
        {
          "name": "_spender",
          "type": "address"
        }
      ],
      "name": "allowance",
      "outputs": [
        {
          "name": "",
          "type": "uint256"
        }
      ],
      "payable": false,
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "payable": false,
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "name": "owner",
          "type": "address"
        },
        {
          "indexed": true,
          "name": "spender",
          "type": "address"
        },
        {
          "indexed": false,
          "name": "value",
          "type": "uint256"
        }
      ],
      "name": "Approval",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "name": "from",
          "type": "address"
        },
        {
          "indexed": true,
          "name": "to",
          "type": "address"
        },
        {
          "indexed": false,
          "name": "value",
          "type": "uint256"
        }
      ],
      "name": "Transfer",
      "type": "event"
    }
  ];
  // 智能合约地址
  const address = '0x4ead9583725ec7e73ddfda21101e8f7b7abfae18';

  let customHttpProvider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545");

  // 创建智能合约
  contract = new ethers.Contract(address, abi, customHttpProvider);
  console.log("contract:" + contract);
  var tokenBalance = document.getElementById('wallet-token-balance');


  return function() {

    contract.balanceOf(activeWallet.address).then(function(balance){
        tokenBalance.value = balance;
    });

    // let tokenBlance = ;

  }


})();

var addActivity = (function() {
    var activity = document.getElementById('wallet-activity');
    return function(message, url) {
        var line = document.createElement('a');
        line.textContent = message;
        if (url) {
            line.setAttribute('href', url);
            line.setAttribute('target', '_blank');
        }
        activity.appendChild(line);
    }
})();



function setupSendEther() {
  var inputTargetAddress = document.getElementById('wallet-send-target-address');
  var inputAmount = document.getElementById('wallet-send-amount');
  var submit = document.getElementById('wallet-submit-send');

  // Validate the address and value (to enable the send button)
  function check() {
      try {
          ethers.utils.getAddress(inputTargetAddress.value);
          ethers.utils.parseEther(inputAmount.value);
      } catch (error) {
          submit.classList.add('disable');
          return;
      }
      submit.classList.remove('disable');
  }
  inputTargetAddress.oninput = check;
  inputAmount.oninput = check;

  // Send ether
  submit.onclick = function() {

      // Matt (from Etherscan) is working on a gasPrice API call, which
      // should be done within a week or so.
      // @TODO
      //var gasPrice = (activeWallet.provider.testnet ? 0x4a817c800: 0xba43b7400);
      //console.log('GasPrice: ' + gasPrice);

      var targetAddress = ethers.utils.getAddress(inputTargetAddress.value);
      var amountWei = ethers.utils.parseEther(inputAmount.value);

      activeWallet.sendTransaction({
          to: targetAddress,
          value: amountWei,
          //gasPrice: activeWallet.provider.getGasPrice(),
          //gasLimit: 21000,
      }).then(function(tx) {
          console.log(tx);

          // Since we only use standard networks, network will always be known
          var tag = activeWallet.provider.network.name + '.';
          if (tag === 'homestead.') { tag = ''; }
          var url = 'https://' + tag + 'etherscan.io/tx/' + tx.hash;
          addActivity('< Transaction sent: ' + tx.hash.substring(0, 20) + '...', url);
          alert('Success!');

          inputTargetAddress.value = '';
          inputAmount.value = '';
          submit.classList.add('disable');

          refreshUI();
      }, function(error) {
          console.log(error);
          showError(error);
      });
  }
}

function setupSendToken() {
  var inputTargetAddress = document.getElementById('wallet-token-send-target-address');
  var inputAmount = document.getElementById('wallet-token-send-amount');
  var submit = document.getElementById('wallet-token-submit-send');

  // Validate the address and value (to enable the send button)
  function check() {
      try {
          ethers.utils.getAddress(inputTargetAddress.value);
      } catch (error) {
          submit.classList.add('disable');
          return;
      }
      submit.classList.remove('disable');
  }
  inputTargetAddress.oninput = check;
  inputAmount.oninput = check;

  // Send token
  submit.onclick = function() {

      // Matt (from Etherscan) is working on a gasPrice API call, which
      // should be done within a week or so.
      // @TODO
      //var gasPrice = (activeWallet.provider.testnet ? 0x4a817c800: 0xba43b7400);
      //console.log('GasPrice: ' + gasPrice);

      var targetAddress = ethers.utils.getAddress(inputTargetAddress.value);
      var amount = inputAmount.value;

      console.log("targetAddress:" + targetAddress + ", amount:" + amount);

      const abi = [
        {
          "constant": true,
          "inputs": [],
          "name": "name",
          "outputs": [
            {
              "name": "",
              "type": "string"
            }
          ],
          "payable": false,
          "stateMutability": "view",
          "type": "function"
        },
        {
          "constant": false,
          "inputs": [
            {
              "name": "_spender",
              "type": "address"
            },
            {
              "name": "_value",
              "type": "uint256"
            }
          ],
          "name": "approve",
          "outputs": [
            {
              "name": "",
              "type": "bool"
            }
          ],
          "payable": false,
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "constant": true,
          "inputs": [],
          "name": "totalSupply",
          "outputs": [
            {
              "name": "",
              "type": "uint256"
            }
          ],
          "payable": false,
          "stateMutability": "view",
          "type": "function"
        },
        {
          "constant": false,
          "inputs": [
            {
              "name": "_from",
              "type": "address"
            },
            {
              "name": "_to",
              "type": "address"
            },
            {
              "name": "_value",
              "type": "uint256"
            }
          ],
          "name": "transferFrom",
          "outputs": [
            {
              "name": "",
              "type": "bool"
            }
          ],
          "payable": false,
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "constant": true,
          "inputs": [],
          "name": "INITIAL_SUPPLY",
          "outputs": [
            {
              "name": "",
              "type": "uint256"
            }
          ],
          "payable": false,
          "stateMutability": "view",
          "type": "function"
        },
        {
          "constant": true,
          "inputs": [],
          "name": "decimals",
          "outputs": [
            {
              "name": "",
              "type": "uint8"
            }
          ],
          "payable": false,
          "stateMutability": "view",
          "type": "function"
        },
        {
          "constant": false,
          "inputs": [
            {
              "name": "_spender",
              "type": "address"
            },
            {
              "name": "_subtractedValue",
              "type": "uint256"
            }
          ],
          "name": "decreaseApproval",
          "outputs": [
            {
              "name": "",
              "type": "bool"
            }
          ],
          "payable": false,
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "constant": true,
          "inputs": [
            {
              "name": "_owner",
              "type": "address"
            }
          ],
          "name": "balanceOf",
          "outputs": [
            {
              "name": "",
              "type": "uint256"
            }
          ],
          "payable": false,
          "stateMutability": "view",
          "type": "function"
        },
        {
          "constant": true,
          "inputs": [],
          "name": "symbol",
          "outputs": [
            {
              "name": "",
              "type": "string"
            }
          ],
          "payable": false,
          "stateMutability": "view",
          "type": "function"
        },
        {
          "constant": false,
          "inputs": [
            {
              "name": "_to",
              "type": "address"
            },
            {
              "name": "_value",
              "type": "uint256"
            }
          ],
          "name": "transfer",
          "outputs": [
            {
              "name": "",
              "type": "bool"
            }
          ],
          "payable": false,
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "constant": false,
          "inputs": [
            {
              "name": "_spender",
              "type": "address"
            },
            {
              "name": "_addedValue",
              "type": "uint256"
            }
          ],
          "name": "increaseApproval",
          "outputs": [
            {
              "name": "",
              "type": "bool"
            }
          ],
          "payable": false,
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "constant": true,
          "inputs": [
            {
              "name": "_owner",
              "type": "address"
            },
            {
              "name": "_spender",
              "type": "address"
            }
          ],
          "name": "allowance",
          "outputs": [
            {
              "name": "",
              "type": "uint256"
            }
          ],
          "payable": false,
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "payable": false,
          "stateMutability": "nonpayable",
          "type": "constructor"
        },
        {
          "anonymous": false,
          "inputs": [
            {
              "indexed": true,
              "name": "owner",
              "type": "address"
            },
            {
              "indexed": true,
              "name": "spender",
              "type": "address"
            },
            {
              "indexed": false,
              "name": "value",
              "type": "uint256"
            }
          ],
          "name": "Approval",
          "type": "event"
        },
        {
          "anonymous": false,
          "inputs": [
            {
              "indexed": true,
              "name": "from",
              "type": "address"
            },
            {
              "indexed": true,
              "name": "to",
              "type": "address"
            },
            {
              "indexed": false,
              "name": "value",
              "type": "uint256"
            }
          ],
          "name": "Transfer",
          "type": "event"
        }
      ];
      // 智能合约地址
      const address = '0x4ead9583725ec7e73ddfda21101e8f7b7abfae18';

      let customHttpProvider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545");

      // 创建智能合约
      contract = new ethers.Contract(address, abi, customHttpProvider);
      let contractWithSigner = contract.connect(activeWallet);


      // activeWallet.estimateGas(
      //
      // )

      contractWithSigner.transfer(targetAddress, amount, {
        gasLimit: 500000,
        gasPrice: ethers.utils.parseUnits("2", "gwei"),
      }).then(function(tx) {
          console.log(tx);

          // Since we only use standard networks, network will always be known
          var tag = activeWallet.provider.network.name + '.';
          if (tag === 'homestead.') { tag = ''; }
          var url = 'https://' + tag + 'etherscan.io/tx/' + tx.hash;
          addActivity('< Token sent: ' + tx.hash.substring(0, 20) + '...', url);
          alert('Success!');

          inputTargetAddress.value = '';
          inputAmount.value = '';
          submit.classList.add('disable');

          refreshToken();
      }, function(error) {
          console.log(error);
          showError(error);
      });
  }
}

// Set up the wallet page
(function() {
  setupSendEther();
  setupSendToken();
})();

function showSelect() {
    document.getElementById('screen-select').style.display = 'block';
    document.getElementById('screen-loading').style.display = 'none';
    document.getElementById('screen-wallet').style.display = 'none';
}

function showLoading(title) {
    document.getElementById('screen-select').style.display = 'none';
    document.getElementById('screen-loading').style.display = 'block';
    document.getElementById('screen-wallet').style.display = 'none';

    document.getElementById('loading-header').textContent = title;
}

function showWallet(wallet) {
    // var network = document.querySelector('.network.option.selected').getAttribute('data-network');
      // new ethers.providers.Web3Provider(web3.currentProvider));
    activeWallet = wallet.connect(new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545"));

    document.getElementById('screen-select').style.display = 'none';
    document.getElementById('screen-loading').style.display = 'none';
    document.getElementById('screen-wallet').style.display = 'block';

    var inputWalletAddress = document.getElementById('wallet-address');
    inputWalletAddress.value = wallet.address;
    inputWalletAddress.onclick = function() {
        this.select();
    };

    refreshUI();
    refreshToken();
}

// 0x627306090abaB3A6e1400e9345bC60c78a8BEf57
// var privateKey = 'c87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3';
// showWallet(new ethers.Wallet(privateKey));
