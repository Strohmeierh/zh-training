use strict; use warnings;
binmode(STDIN,':encoding(UTF-8)'); binmode(STDOUT,':encoding(UTF-8)');
local $/; my $j=<STDIN>;
my @q = $j =~ /\{("id".*?"richtig":"[a-d]")\}/g;
print "Anzahl Fragen: ", scalar(@q), "\n";
my ($empty,$badans,$shortq,$stray)=(0,0,0,0);
for my $blk (@q){
  my %f;
  while($blk =~ /"(\w+)":"((?:[^"\\]|\\.)*)"/g){ $f{$1}=$2; }
  for my $k (qw(a b c d)){
    if(!defined $f{$k} || $f{$k} eq ''){ $empty++; print "LEER opt $k id$f{id}: $f{frage}\n"; }
  }
  $badans++ unless ($f{richtig}//'') =~ /^[a-d]$/;
  if(length($f{frage}//'')<8){ $shortq++; print "KURZ frage id$f{id}: '$f{frage}'\n"; }
  for my $k (qw(a b c d)){
    if(($f{$k}//'') =~ /^[a-d]\)/){ $stray++; print "STRAY id$f{id} opt$k: '$f{$k}'\n"; }
  }
}
print "Leere: $empty | Ungueltige Antwort: $badans | Kurze Fragen: $shortq | Stray-Marker: $stray\n";
