{ stdenv, fetchFromGitHub, zlib }:

stdenv.mkDerivation rec {
  name = "psmc-${version}";
  version = "e5f7df5"; # Git commit from January 21, 2016

  src = fetchFromGitHub {
    owner = "lh3";
    repo = "psmc";
    rev = "e5f7df5d00bb75ec603ae0beff62c0d7e37640b9";
    sha256 = "1fh8vhrjabyc4vsgy7fqy24r83557vzgj3a3w4353nljdgz1q4il";
  };

  buildInputs = [ zlib ];
  buildPhase = ''
    make
    cd utils; make; cd ..
  '';
  installPhase = ''
    mkdir -p $out/bin
    cp psmc $out/bin/
    cp utils/avg.pl $out/bin/
    cp utils/calD $out/bin/
    cp utils/cntcpg $out/bin/
    cp utils/ctime_plot.pl $out/bin/
    cp utils/dec2ctime.pl $out/bin/
    cp utils/dec2img.js $out/bin/
    cp utils/decode2bed.pl $out/bin/
    cp utils/fq2psmcfa $out/bin/
    cp utils/history2ms.pl $out/bin/
    cp utils/ms2psmcfa.pl $out/bin/
    cp utils/mutDiff $out/bin/
    cp utils/pcnt_bezier.lua $out/bin/
    cp utils/psmc2history.pl $out/bin/
    cp utils/psmc_plot.pl $out/bin/
    cp utils/psmc_trunc.pl $out/bin/
    cp utils/splitfa $out/bin/
  '';

  meta = with stdenv.lib; {
    description = "Implementation of the Pairwise Sequentially Markovian Coalescent (PSMC) model";
    homepage = https://github.com/lh3/psmc;
    license = licenses.mit;
    maintainers = with maintainers; [ bmpvieira ];
    platforms = platforms.all;
  };
}
