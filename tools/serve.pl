#!/usr/bin/perl
# Minimaler statischer HTTP-Server für die lokale Vorschau (nur Entwicklung).
use strict; use warnings;
use IO::Socket::INET;
use IO::Select;
my $port = $ENV{PORT} || 8123;
my $root = $ARGV[0] || $ENV{ROOT} || '.';
my %MIME = (
  html=>'text/html; charset=utf-8', css=>'text/css; charset=utf-8',
  js=>'application/javascript; charset=utf-8', json=>'application/json; charset=utf-8',
  svg=>'image/svg+xml', png=>'image/png', ico=>'image/x-icon', txt=>'text/plain; charset=utf-8',
);
my $srv = IO::Socket::INET->new(LocalAddr=>'127.0.0.1', LocalPort=>$port,
  Proto=>'tcp', Listen=>50, ReuseAddr=>1) or die "Bind $port: $!";
$| = 1;
print "Serving $root on http://127.0.0.1:$port\n";

while (my $c = $srv->accept) {
  $c->autoflush(1);
  # Auf die Anfragezeile warten, aber nicht ewig blockieren (Chrome öffnet
  # spekulative Verbindungen ohne Daten – die würden den Server sonst aufhängen).
  my $sel = IO::Select->new($c);
  unless ($sel->can_read(3)) { close $c; next; }
  my $req = <$c>;
  unless (defined $req) { close $c; next; }
  if ($req =~ m{^GET\s+(\S+)\s+HTTP}) {
    my $path = $1; $path =~ s/\?.*$//; $path = '/index.html' if $path eq '/';
    $path =~ s/\.\.//g;                       # kein Directory-Traversal
    my $file = $root . $path;
    if (-f $file) {
      my ($ext) = $file =~ /\.(\w+)$/; $ext = lc($ext // '');
      my $type = $MIME{$ext} || 'application/octet-stream';
      open(my $fh, '<:raw', $file); local $/; my $body = <$fh>; close $fh;
      print $c "HTTP/1.1 200 OK\r\nContent-Type: $type\r\n",
               "Cache-Control: no-store\r\nContent-Length: ", length($body),
               "\r\nConnection: close\r\n\r\n", $body;
    } else {
      print $c "HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\nConnection: close\r\n\r\n";
    }
  }
  close $c;
}
