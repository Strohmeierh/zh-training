#!/usr/bin/perl
# Minimaler HTTP-Server für die lokale Vorschau (nur Entwicklung).
# Zusätzlich: Mock-Sync-Endpoint /mock-sync?code=… (GET/PUT/POST), der den
# Cloudflare-Worker nachbildet, damit der Auto-Sync lokal getestet werden kann.
use strict; use warnings;
use IO::Socket::INET;
use IO::Select;
use File::Path qw(make_path);
my $port = $ENV{PORT} || 8123;
my $root = $ARGV[0] || $ENV{ROOT} || '.';
my $mockdir = "$root/tools/.mock";
my %MIME = (
  html=>'text/html; charset=utf-8', css=>'text/css; charset=utf-8',
  js=>'application/javascript; charset=utf-8', json=>'application/json; charset=utf-8',
  svg=>'image/svg+xml', png=>'image/png', ico=>'image/x-icon', txt=>'text/plain; charset=utf-8',
  md=>'text/plain; charset=utf-8',
);
my $srv = IO::Socket::INET->new(LocalAddr=>'127.0.0.1', LocalPort=>$port,
  Proto=>'tcp', Listen=>50, ReuseAddr=>1) or die "Bind $port: $!";
$| = 1;
print "Serving $root on http://127.0.0.1:$port (mit /mock-sync)\n";

my $CORS = "Access-Control-Allow-Origin: *\r\n"
         . "Access-Control-Allow-Methods: GET, PUT, POST, OPTIONS\r\n"
         . "Access-Control-Allow-Headers: Content-Type\r\n";

sub send_json {
  my ($c, $status, $json) = @_;
  print $c "HTTP/1.1 $status\r\nContent-Type: application/json\r\n", $CORS,
           "Cache-Control: no-store\r\nContent-Length: ", length($json),
           "\r\nConnection: close\r\n\r\n", $json;
}

sub handle_mock {
  my ($c, $method, $rawpath, $body) = @_;
  my ($code) = $rawpath =~ /[?&]code=([^&]+)/;
  $code = '' unless defined $code;
  $code =~ s/%([0-9A-Fa-f]{2})/chr(hex($1))/ge;  # einfache URL-Decodierung
  unless ($code =~ /^[A-Za-z0-9_-]{16,128}$/) { send_json($c, '400 Bad Request', '{"error":"invalid code"}'); return; }
  make_path($mockdir) unless -d $mockdir;
  my $file = "$mockdir/$code.json";
  if ($method eq 'GET') {
    my $data = '{"stats":{}}';
    if (-f $file) { open(my $fh,'<:raw',$file); local $/; $data = <$fh>; close $fh; }
    send_json($c, '200 OK', $data);
  } elsif ($method eq 'PUT' || $method eq 'POST') {
    # Schutz wie im echten Worker: leeren Stand nicht über vorhandene Daten
    # schreiben (ausser ?force=1).
    my $force = ($rawpath =~ /[?&]force=1\b/) ? 1 : 0;
    my $incoming_empty = ($body =~ /"stats"\s*:\s*\{\s*\}/) ? 1 : 0;
    if (!$force && $incoming_empty && -f $file) {
      open(my $in,'<:raw',$file); local $/; my $old = <$in>; close $in;
      if (defined $old && $old !~ /"stats"\s*:\s*\{\s*\}/ && $old =~ /"stats"/) {
        send_json($c, '200 OK', '{"ok":true,"kept":true}'); return;
      }
    }
    open(my $fh,'>:raw',$file) or do { send_json($c,'500 Error','{"error":"write"}'); return; };
    print $fh $body; close $fh;
    send_json($c, '200 OK', '{"ok":true}');
  } else {
    send_json($c, '405 Method Not Allowed', '{"error":"method"}');
  }
}

while (my $c = $srv->accept) {
  $c->autoflush(1);
  my $sel = IO::Select->new($c);
  unless ($sel->can_read(3)) { close $c; next; }
  my $req = <$c>;
  unless (defined $req) { close $c; next; }
  my ($method, $rawpath) = $req =~ m{^(\w+)\s+(\S+)\s+HTTP} ? ($1, $2) : ('', '');

  # Header lesen, Content-Length merken
  my $clen = 0;
  while (defined(my $line = <$c>)) {
    $line =~ s/\r?\n$//;
    last if $line eq '';
    $clen = $1 if $line =~ /^content-length:\s*(\d+)/i;
  }
  # Body lesen (falls vorhanden). WICHTIG: gepuffertes read() verwenden – nicht
  # sysread() – da oben bereits mit <$c> (gepuffert) gelesen wurde; ein Mix
  # würde bereits gepufferte Body-Bytes verlieren.
  my $body = '';
  while (length($body) < $clen) {
    my $chunk = '';
    my $n = read($c, $chunk, $clen - length($body));
    last if !defined($n) || $n == 0;
    $body .= $chunk;
  }

  if ($method eq 'OPTIONS') {
    print $c "HTTP/1.1 204 No Content\r\n", $CORS, "Content-Length: 0\r\nConnection: close\r\n\r\n";
  } elsif ($rawpath =~ m{^/mock-sync\b}) {
    handle_mock($c, $method, $rawpath, $body);
  } elsif ($method eq 'GET') {
    my $path = $rawpath; $path =~ s/\?.*$//; $path = '/index.html' if $path eq '/';
    $path =~ s/\.\.//g;
    my $file = $root . $path;
    if (-f $file) {
      my ($ext) = $file =~ /\.(\w+)$/; $ext = lc($ext // '');
      my $type = $MIME{$ext} || 'application/octet-stream';
      open(my $fh, '<:raw', $file); local $/; my $data = <$fh>; close $fh;
      print $c "HTTP/1.1 200 OK\r\nContent-Type: $type\r\n",
               "Cache-Control: no-store\r\nContent-Length: ", length($data),
               "\r\nConnection: close\r\n\r\n", $data;
    } else {
      print $c "HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\nConnection: close\r\n\r\n";
    }
  } else {
    print $c "HTTP/1.1 405 Method Not Allowed\r\nContent-Length: 0\r\nConnection: close\r\n\r\n";
  }
  close $c;
}
